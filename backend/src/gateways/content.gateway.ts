export abstract class ContentGateway {
    abstract getCourse(courseId: string): Promise<any>;
    abstract getCourseStructure(courseId: string): Promise<any>;
    abstract getCoursesByCreator(creatorId: string): Promise<any[]>;
    abstract getLesson(lessonId: string): Promise<any>;
    abstract getMaterial(materialId: string): Promise<any>;
    abstract getCourseQuizzes(courseId: string): Promise<any[]>;
    abstract getLatestQuizResult(learnerId: string, courseId: string): Promise<any>;
    abstract getQuizAttempts(learnerId: string, courseId: string): Promise<any[]>;
}
