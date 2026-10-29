import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { SupabaseService } from '../../config/supabase.service.js';

const BUCKET = 'lesson-materials';
const MAX_SIZE = 6 * 1024 * 1024;
const FILE_TYPES: Record<string, { type: string; contentType: string; mimes: string[] }> = {
  '.pdf': { type: 'PDF', contentType: 'application/pdf', mimes: ['application/pdf'] },
  '.png': { type: 'Image', contentType: 'image/png', mimes: ['image/png'] },
  '.jpg': { type: 'Image', contentType: 'image/jpeg', mimes: ['image/jpeg'] },
  '.jpeg': { type: 'Image', contentType: 'image/jpeg', mimes: ['image/jpeg'] },
  '.webp': { type: 'Image', contentType: 'image/webp', mimes: ['image/webp'] },
  '.cs': { type: 'Code Sample', contentType: 'text/plain', mimes: ['', 'text/plain', 'text/x-csharp', 'application/octet-stream'] },
  '.zip': { type: 'Code Sample', contentType: 'application/zip', mimes: ['', 'application/zip', 'application/x-zip-compressed', 'application/octet-stream'] },
};

type UploadedFile = { originalname: string; mimetype: string; size: number; buffer: Buffer };

@Injectable()
export class MaterialsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private async getLesson(lessonId: string, publishedOnly = false) {
    const client = this.supabaseService.getClient();
    const { data: lesson, error } = await client.from('lessons')
      .select('id, title, status, chapter_id').eq('id', lessonId).maybeSingle();
    if (error) throw new InternalServerErrorException('Unable to load lesson');
    if (!lesson || (publishedOnly && lesson.status !== 'published')) throw new NotFoundException('Lesson not found');
    if (publishedOnly) {
      const { data: chapter, error: chapterError } = await client.from('chapters')
        .select('course_id').eq('id', lesson.chapter_id).maybeSingle();
      if (chapterError) throw new InternalServerErrorException('Unable to load chapter');
      if (!chapter) throw new NotFoundException('Lesson not found');
      const { data: course, error: courseError } = await client.from('courses')
        .select('status').eq('id', chapter.course_id).maybeSingle();
      if (courseError) throw new InternalServerErrorException('Unable to load course');
      if (!course || course.status !== 'published') throw new NotFoundException('Lesson not found');
    }
    return lesson;
  }

  private validateFile(file?: UploadedFile) {
    if (!file || !file.buffer || !file.size) throw new BadRequestException('A file is required');
    if (file.size > MAX_SIZE) throw new BadRequestException('File exceeds 6 MiB');
    const extension = extname(file.originalname).toLowerCase();
    const config = FILE_TYPES[extension];
    if (!config || !config.mimes.includes(file.mimetype)) throw new BadRequestException('Unsupported file type');
    const bytes = file.buffer;
    const has = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);
    const valid = extension === '.pdf' ? has(0x25, 0x50, 0x44, 0x46, 0x2d)
      : extension === '.png' ? has(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
      : extension === '.jpg' || extension === '.jpeg' ? has(0xff, 0xd8, 0xff)
      : extension === '.webp' ? bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
      : extension === '.zip' ? has(0x50, 0x4b, 0x03, 0x04)
      : !bytes.includes(0) && !bytes.toString('utf8').includes('\ufffd');
    if (!valid) throw new BadRequestException('File content does not match its type');
    return { extension, ...config };
  }

  async listForLesson(lessonId: string, publishedOnly = false) {
    await this.getLesson(lessonId, publishedOnly);
    const { data, error } = await this.supabaseService.getClient().from('materials')
      .select('id, lesson_id, title, file_type, file_size, created_at')
      .eq('lesson_id', lessonId).order('created_at', { ascending: false });
    if (error) throw new InternalServerErrorException('Unable to load materials');
    return data ?? [];
  }

  async listAll() {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.from('materials')
      .select('id, lesson_id, title, file_type, file_size, created_at')
      .order('created_at', { ascending: false });
    if (error) throw new InternalServerErrorException('Unable to load materials');
    const lessonIds = [...new Set((data ?? []).map((item) => item.lesson_id))];
    if (!lessonIds.length) return [];
    const { data: lessons, error: lessonError } = await client.from('lessons')
      .select('id, title, chapter_id').in('id', lessonIds);
    if (lessonError) throw new InternalServerErrorException('Unable to load material lessons');
    const chapterIds = [...new Set((lessons ?? []).map((item) => item.chapter_id))];
    const { data: chapters, error: chapterError } = await client.from('chapters')
      .select('id, course_id').in('id', chapterIds);
    if (chapterError) throw new InternalServerErrorException('Unable to load material chapters');
    const courseIds = [...new Set((chapters ?? []).map((item) => item.course_id))];
    const { data: courses, error: courseError } = await client.from('courses')
      .select('id, title').in('id', courseIds);
    if (courseError) throw new InternalServerErrorException('Unable to load material courses');
    const lessonMap = new Map((lessons ?? []).map((item) => [item.id, item]));
    const chapterMap = new Map((chapters ?? []).map((item) => [item.id, item]));
    const courseMap = new Map((courses ?? []).map((item) => [item.id, item]));
    return (data ?? []).map((item) => {
      const lesson = lessonMap.get(item.lesson_id);
      const chapter = lesson ? chapterMap.get(lesson.chapter_id) : undefined;
      return { ...item, lesson_title: lesson?.title ?? '', course_id: chapter?.course_id ?? '', course_title: chapter ? courseMap.get(chapter.course_id)?.title ?? '' : '' };
    });
  }

  async upload(lessonId: string, file: UploadedFile, requestedTitle?: string) {
    await this.getLesson(lessonId);
    const config = this.validateFile(file);
    const title = requestedTitle?.trim() || file.originalname;
    if (title.length > 255) throw new BadRequestException('Title is too long');
    const path = `${lessonId}/${randomUUID()}${config.extension}`;
    const client = this.supabaseService.getClient();
    const { error: storageError } = await client.storage.from(BUCKET).upload(path, file.buffer, {
      contentType: config.contentType, upsert: false,
    });
    if (storageError) throw new InternalServerErrorException('Unable to upload file');
    const { data, error } = await client.from('materials').insert({
      lesson_id: lessonId, title, file_url: path, file_type: config.type, file_size: file.size,
    }).select('id, lesson_id, title, file_type, file_size, created_at').single();
    if (error || !data) {
      await client.storage.from(BUCKET).remove([path]);
      throw new InternalServerErrorException('Unable to save material');
    }
    return data;
  }

  private async getMaterial(id: string, publishedOnly = false) {
    const { data, error } = await this.supabaseService.getClient().from('materials')
      .select('id, lesson_id, title, file_url, file_type, file_size, created_at')
      .eq('id', id).maybeSingle();
    if (error) throw new InternalServerErrorException('Unable to load material');
    if (!data) throw new NotFoundException('Material not found');
    await this.getLesson(data.lesson_id, publishedOnly);
    return data;
  }

  async access(id: string, publishedOnly = false, download = false) {
    const material = await this.getMaterial(id, publishedOnly);
    // Legacy external URLs are not signed by Storage.
    if (/^https:\/\//i.test(material.file_url)) return { url: material.file_url };
    if (!material.file_url.startsWith(`${material.lesson_id}/`)) throw new NotFoundException('Material file not found');
    const { data, error } = await this.supabaseService.getClient().storage.from(BUCKET)
      .createSignedUrl(material.file_url, 300, download ? { download: material.title } : undefined);
    if (error || !data) throw new InternalServerErrorException('Unable to open material');
    return { url: data.signedUrl };
  }

  async rename(id: string, title: string) {
    await this.getMaterial(id);
    const cleanTitle = title.trim();
    if (!cleanTitle) throw new BadRequestException('Title is required');
    const { data, error } = await this.supabaseService.getClient().from('materials')
      .update({ title: cleanTitle }).eq('id', id)
      .select('id, lesson_id, title, file_type, file_size, created_at').single();
    if (error || !data) throw new InternalServerErrorException('Unable to rename material');
    return data;
  }

  async remove(id: string) {
    const material = await this.getMaterial(id);
    const client = this.supabaseService.getClient();
    if (!/^https:\/\//i.test(material.file_url)) {
      const { error: storageError } = await client.storage.from(BUCKET).remove([material.file_url]);
      if (storageError) throw new InternalServerErrorException('Unable to remove file');
    }
    const { error } = await client.from('materials').delete().eq('id', id);
    if (error) throw new InternalServerErrorException('Unable to remove material record');
    return { id };
  }
}
