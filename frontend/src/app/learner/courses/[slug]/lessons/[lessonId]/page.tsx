'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { courseApi } from '@/lib/api';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  Bot,
  Play,
  Copy,
  Check,
  Code2,
  Lock,
  Download,
  FileText,
  Video,
  Sparkles,
  Send,
  Terminal,
  Trophy,
  Zap,
  Award,
  Bookmark,
  Edit3,
  X,
  Save,
  Layers,
} from 'lucide-react';

// DỮ LIỆU ĐỒNG BỘ TRỰC TIẾP TỪ PAGE_7.TSX
const COURSE_MAP: Record<string, any> = {
  'csharp-fundamentals': {
    title: 'C# Fundamentals',
    level: 'Beginner',
    instructor: 'Dr. Lan Nguyen',
    instructorRole: 'Content author • C# instructor',
    resources: [
      { name: 'C# Language Cheat Sheet', type: 'PDF · 1.2 MB', isVideo: false },
      { name: 'Installing the .NET SDK (walkthrough)', type: 'Video · 84 MB', isVideo: true },
    ],
    tests: [
      {
        id: 'variables-quiz',
        title: 'Variables & Data Types Quiz',
        description: '15 questions in this attempt',
        duration: '20 minutes, timed',
        difficulty: 'Easy',
      },
      {
        id: 'final-assessment',
        title: 'C# Fundamentals — Final Assessment',
        description: '6 questions in this attempt',
        duration: '60 minutes, timed',
        difficulty: 'Medium',
      },
    ],
    chapters: [
      {
        title: 'Introduction to C#',
        lessons: [
          { id: 'what-is-csharp', title: 'What is C#?', duration: '8 min', completed: true },
          { id: 'installing-dotnet', title: 'Installing .NET', duration: '10 min', completed: true },
          { id: 'your-first-csharp-program', title: 'Your First C# Program', duration: '12 min', completed: true },
        ],
      },
      {
        title: 'Variables and Data Types',
        lessons: [
          { id: 'variables-overview', title: 'Variables Overview & Syntax', duration: '11 min', completed: true },
          { id: 'primitive-data-types', title: 'Primitive Data Types', duration: '14 min', completed: true },
          { id: 'type-conversion', title: 'Type Conversion & Casting', duration: '9 min', completed: true },
          { id: 'nullable-types', title: 'Nullable Value Types in C#', duration: '12 min', completed: true },
        ],
      },
      {
        title: 'Control Flow',
        lessons: [
          { id: 'if-else-switch', title: 'if / else and switch', duration: '13 min', completed: true },
          { id: 'loops', title: 'for, while and foreach', duration: '15 min', completed: true },
          { id: 'break-continue', title: 'break, continue and goto', duration: '7 min', completed: true },
        ],
      },
      {
        title: 'Methods',
        lessons: [
          { id: 'what-are-methods', title: 'What are methods?', duration: '8 min', completed: false },
          { id: 'parameters-and-returns', title: 'Parameters and return values', duration: '12 min', completed: false },
          { id: 'method-overloads', title: 'Method overloads', duration: '10 min', completed: false },
        ],
      },
    ],
  },
  'object-oriented-programming-in-csharp': {
    title: 'Object-Oriented Programming in C#',
    level: 'Intermediate',
    instructor: 'Dr. Lan Nguyen',
    instructorRole: 'Content author • C# instructor',
    resources: [
      { name: 'OOP Practice Sheet', type: 'PDF · 2.1 MB', isVideo: false },
      { name: 'Class Design Checklist', type: 'Document · 68 KB', isVideo: false },
    ],
    tests: [
      {
        id: 'oop-quick-check',
        title: 'OOP Quick Check',
        description: '5 questions in this attempt',
        duration: '25 minutes, timed',
        difficulty: 'Medium',
      },
    ],
    chapters: [
      {
        title: 'Classes and Objects',
        lessons: [
          { id: 'classes-and-objects', title: 'Classes and Objects', duration: '9 min', completed: true },
          { id: 'constructors', title: 'Constructors', duration: '11 min', completed: true },
          { id: 'properties', title: 'Properties', duration: '8 min', completed: false },
        ],
      },
      {
        title: 'Encapsulation',
        lessons: [
          { id: 'access-modifiers', title: 'Access modifiers', duration: '12 min', completed: true },
          { id: 'fields-and-methods', title: 'Fields and methods', duration: '10 min', completed: true },
          { id: 'readonly-and-static', title: 'Readonly and static', duration: '9 min', completed: false },
        ],
      },
    ],
  },
};

interface LessonDetail {
  id: string;
  order: number;
  title: string;
  duration: string;
  chapter: string;
  objectives: string[];
  mainHeading: string;
  subHeading: string;
  description: string;
  tableData: {
    keyword: string;
    ctsType: string;
    size: string;
    description: string;
  }[];
  initialCode: string;
  defaultOutput: string;
  proTipTitle: string;
  proTipContent: string;
}

interface LearnerLessonChapter {
  id: string;
  title: string;
  lessons: Array<{
    id: string;
    title: string;
    duration: number;
    status: string;
    content: string | null;
    codeExample: string | null;
  }>;
}

const LESSON_DATABASE: Record<string, LessonDetail> = {
  // === CHƯƠNG 1 ===
  'what-is-csharp': {
    id: 'what-is-csharp',
    order: 1,
    title: 'What is C#?',
    duration: '8 min',
    chapter: 'Introduction to C#',
    objectives: [
      'Hiểu rõ vị trí của ngôn ngữ C# và nền tảng .NET hiện đại.',
      'Nắm được quá trình biên dịch từ C# sang mã IL (Intermediate Language) và chạy trên CLR.',
      'Tìm hiểu các ứng dụng thực tế: Web API, Cloud, Desktop, Game (Unity) và Mobile.',
      'Lợi ích của hệ thống quản lý bộ nhớ tự động với Garbage Collector (GC).',
    ],
    mainHeading: 'Giới thiệu ngôn ngữ lập trình C# & Hệ sinh thái .NET',
    subHeading: 'Ngôn ngữ hiện đại, đa nền tảng, kiểu tĩnh mạnh và hiệu năng cao',
    description:
      'C# (phát âm là C-Sharp) là một ngôn ngữ lập trình hướng đối tượng, đa nền tảng và an toàn kiểu (type-safe) được phát triển bởi Microsoft. Chạy trên môi trường Common Language Runtime (CLR), C# kết hợp hiệu năng cao với cú pháp hiện đại, rõ ràng.',
    tableData: [
      { keyword: 'Roslyn Compiler', ctsType: 'C# Compiler', size: 'Native', description: 'Biên dịch mã nguồn .cs thành mã trung gian IL (.dll)' },
      { keyword: 'CLR Runtime', ctsType: 'Execution Engine', size: 'CoreCLR', description: 'Nạp file IL, cấp phát bộ nhớ và quản lý Garbage Collection' },
      { keyword: 'JIT Compiler', ctsType: 'Just-In-Time', size: 'Dynamic', description: 'Biên dịch mã IL thành mã máy trực tiếp khi thực thi' },
      { keyword: 'Cross-Platform', ctsType: 'Multi-OS', size: '.NET 8+', description: 'Chạy nhất quán trên Windows, Linux và macOS' },
    ],
    initialCode: `using System;

public class Program
{
    public static void Main()
    {
        Console.WriteLine("Chào mừng bạn đến với C# 12 & .NET!");
        Console.WriteLine("Hệ điều hành: " + Environment.OSVersion);
        Console.WriteLine("Phiên bản .NET Runtime: " + Environment.Version);
    }
}`,
    defaultOutput: 'Chào mừng bạn đến với C# 12 & .NET!\nHệ điều hành: Microsoft Windows NT 10.0\nPhiên bản .NET Runtime: 8.0.0\n\nProcess finished with exit code 0.',
    proTipTitle: 'Góc nhìn kiến trúc .NET',
    proTipContent:
      'C# không biên dịch trực tiếp ra mã máy như C/C++, mà đi qua mã trung gian IL. Nhờ cơ chế JIT (Just-In-Time) của CLR, chương trình tối ưu hoá trực tiếp theo phần cứng máy đích khi đang chạy.',
  },

  'installing-dotnet': {
    id: 'installing-dotnet',
    order: 2,
    title: 'Installing .NET',
    duration: '10 min',
    chapter: 'Introduction to C#',
    objectives: [
      'Phân biệt .NET SDK (dùng để code và build) và .NET Runtime (chỉ dùng để chạy).',
      'Cài đặt .NET SDK trên máy tính cá nhân.',
      'Sử dụng .NET CLI để kiểm tra môi trường bằng lệnh dotnet --info.',
      'Cấu hình VS Code hoặc Visual Studio để lập trình C#.',
    ],
    mainHeading: 'Cài đặt .NET SDK & Thiết lập môi trường phát triển',
    subHeading: 'Sẵn sàng công cụ dòng lệnh .NET CLI và IDE',
    description:
      '.NET SDK cung cấp mọi công cụ cần thiết để tạo, biên dịch, kiểm thử và chạy ứng dụng. Bạn có thể sử dụng giao diện dòng lệnh .NET CLI từ bất kỳ terminal nào.',
    tableData: [
      { keyword: 'dotnet new', ctsType: 'CLI Command', size: 'Built-in', description: 'Tạo mới project (console, webapi, blazor...)' },
      { keyword: 'dotnet build', ctsType: 'CLI Command', size: 'Built-in', description: 'Biên dịch mã nguồn và kiểm tra lỗi cú pháp' },
      { keyword: 'dotnet run', ctsType: 'CLI Command', size: 'Built-in', description: 'Biên dịch và chạy ứng dụng ngay lập tức' },
      { keyword: 'dotnet test', ctsType: 'CLI Command', size: 'Built-in', description: 'Chạy toàn bộ unit tests trong project' },
    ],
    initialCode: `using System;

public class Program
{
    public static void Main()
    {
        Console.WriteLine(".NET SDK đã sẵn sàng hoạt động!");
        Console.WriteLine("Thư mục thực thi: " + AppDomain.CurrentDomain.BaseDirectory);
    }
}`,
    defaultOutput: '.NET SDK đã sẵn sàng hoạt động!\nThư mục thực thi: C:\\CSharpHub\\bin\\Debug\\net8.0\\\n\nProcess finished with exit code 0.',
    proTipTitle: 'Phân biệt SDK vs Runtime',
    proTipContent:
      'Máy lập trình viên luôn cần cài .NET SDK. Máy chủ Production chỉ cần cài .NET Runtime tương ứng để nhẹ hơn và giảm bề mặt bảo mật.',
  },

  'your-first-csharp-program': {
    id: 'your-first-csharp-program',
    order: 3,
    title: 'Your First C# Program',
    duration: '12 min',
    chapter: 'Introduction to C#',
    objectives: [
      'Hiểu cấu trúc của một tập tin C# chuẩn: namespace, class và hàm Main.',
      'Khái niệm Top-Level Statements được giới thiệu từ C# 9 đến nay.',
      'Sử dụng Console.WriteLine và Console.ReadLine để nhập xuất.',
      'Cơ chế comment giải thích code (// và /* */).',
    ],
    mainHeading: 'Chương trình C# đầu tiên & Cấu trúc Top-Level Statements',
    subHeading: 'Tìm hiểu điểm khởi đầu (Entry Point) của mọi ứng dụng',
    description:
      'Mỗi ứng dụng C# console đều bắt đầu từ hàm Main. Từ C# 9 trở đi, cú pháp Top-Level Statements cho phép viết mã lệnh trực tiếp mà không cần bọc class hay namespace cồng kềnh.',
    tableData: [
      { keyword: 'Console.WriteLine()', ctsType: 'I/O Method', size: 'System', description: 'In dữ liệu ra terminal và tự động xuống dòng' },
      { keyword: 'Console.ReadLine()', ctsType: 'I/O Method', size: 'System', description: 'Đọc dữ liệu người dùng nhập từ bàn phím' },
      { keyword: 'static void Main()', ctsType: 'Entry Point', size: 'Classic', description: 'Hàm khởi chạy truyền thống của ứng dụng' },
      { keyword: 'Top-Level Statements', ctsType: 'C# 9+ Feature', size: 'Modern', description: 'Viết lệnh thực thi trực tiếp không cần boilerplates' },
    ],
    initialCode: `using System;

Console.Write("Nhập tên của bạn: ");
string name = "Alex"; // Giá trị demo
Console.WriteLine($"Xin chào, {name}! Chúc bạn học tốt C#.");`,
    defaultOutput: 'Nhập tên của bạn: Alex\nXin chào, Alex! Chúc bạn học tốt C#.\n\nProcess finished with exit code 0.',
    proTipTitle: 'String Interpolation ($"...")',
    proTipContent:
      'Hãy luôn dùng cú pháp $"Xin chào {name}" thay vì dùng dấu cộng để ghép chuỗi. Code vừa dễ nhìn vừa có hiệu năng tốt hơn.',
  },

  // === CHƯƠNG 2 ===
  'variables-overview': {
    id: 'variables-overview',
    order: 1,
    title: 'Variables Overview & Syntax',
    duration: '11 min',
    chapter: 'Variables and Data Types',
    objectives: [
      'Hiểu khái niệm biến và vùng nhớ lưu trữ trong C#.',
      'Nắm vững cú pháp khai báo và khởi tạo giá trị biến.',
      'Sử dụng từ khóa var (implicit typing) đúng cách.',
      'Quy ước đặt tên biến (camelCase) chuẩn .NET.',
    ],
    mainHeading: 'Cú pháp khai báo biến & Implicit Typing trong C#',
    subHeading: 'Khởi tạo và quản lý biến với từ khóa var và kiểu tường minh',
    description:
      'Biến là tên gọi đại diện cho một vùng ô nhớ lưu trữ dữ liệu. Trong C#, bạn có thể khai báo biến với kiểu dữ liệu tường minh (explicit) hoặc dùng từ khóa var để trình biên dịch tự suy luận kiểu.',
    tableData: [
      { keyword: 'int x = 10;', ctsType: 'Explicit', size: '4 bytes', description: 'Khai báo tường minh kiểu số nguyên' },
      { keyword: 'var name = "Alex";', ctsType: 'Implicit (string)', size: 'Dynamic', description: 'Trình biên dịch suy luận thành System.String' },
      { keyword: 'const double PI = 3.14;', ctsType: 'Constant', size: '8 bytes', description: 'Hằng số không thể thay đổi giá trị' },
      { keyword: 'readonly int MaxId;', ctsType: 'Readonly', size: '4 bytes', description: 'Chỉ gán giá trị tại constructor hoặc khai báo' },
    ],
    initialCode: `using System;

public class Program
{
    public static void Main()
    {
        string courseName = "C# Fundamentals";
        var lessonNumber = 1;
        var isPublished = true;

        Console.WriteLine($"Khóa học: {courseName}");
        Console.WriteLine($"Bài số: {lessonNumber} - Đã đăng: {isPublished}");
    }
}`,
    defaultOutput: 'Khóa học: C# Fundamentals\nBài số: 1 - Đã đăng: True\n\nProcess finished with exit code 0.',
    proTipTitle: 'Khi nào nên dùng "var"?',
    proTipContent:
      'Chỉ nên dùng "var" khi vế phải đã thể hiện rõ kiểu dữ liệu (ví dụ: var list = new List<string>();) để tránh làm code khó đọc.',
  },

  'primitive-data-types': {
    id: 'primitive-data-types',
    order: 2,
    title: 'Primitive Data Types',
    duration: '14 min',
    chapter: 'Variables and Data Types',
    objectives: [
      'Phân biệt nhóm kiểu số nguyên, số thực dấu phẩy động và boolean.',
      'Nắm rõ kích thước bộ nhớ (bytes) và phạm vi lưu trữ trên CLR 64-bit.',
      'Hiểu vì sao phải dùng decimal trong tính toán tài chính.',
      'Cơ chế cấp phát trực tiếp của Value Type trên Thread Stack.',
    ],
    mainHeading: 'C# Value Types & Hệ thống kiểu (.NET CTS)',
    subHeading: 'Hiểu sâu cách CLR lưu trữ và xử lý dữ liệu nguyên thủy',
    description:
      'Trong C#, tất cả các kiểu dữ liệu số cơ bản và boolean đều là Value Types, kế thừa từ System.ValueType. Khi khai báo cục bộ trong hàm, biến sẽ được lưu trên Stack để truy cập với tốc độ tức thì.',
    tableData: [
      { keyword: 'int', ctsType: 'System.Int32', size: '4 bytes (32-bit)', description: '-2,147,483,648 đến 2,147,483,647' },
      { keyword: 'long', ctsType: 'System.Int64', size: '8 bytes (64-bit)', description: '-9.22 × 10¹⁸ đến 9.22 × 10¹⁸' },
      { keyword: 'double', ctsType: 'System.Double', size: '8 bytes (64-bit)', description: '~15–17 chữ số chính xác (Khoa học)' },
      { keyword: 'decimal', ctsType: 'System.Decimal', size: '16 bytes (128-bit)', description: '28–29 chữ số chính xác (Tài chính)' },
      { keyword: 'bool', ctsType: 'System.Boolean', size: '1 byte', description: 'true hoặc false' },
    ],
    initialCode: `using System;

public class Program
{
    public static void Main()
    {
        int userAge = 28;
        decimal accountBalance = 14250.75m;
        bool isActive = true;
        char tier = 'A';

        Console.WriteLine($"User Age: {userAge} (Size: {sizeof(int)} bytes)");
        Console.WriteLine($"Balance: {accountBalance:C} (Size: {sizeof(decimal)} bytes)");
        Console.WriteLine($"Active Status: {isActive}");
        Console.WriteLine($"Tier: {tier} (Size: {sizeof(char)} bytes)");
    }
}`,
    defaultOutput:
      'User Age: 28 (Size: 4 bytes)\nBalance: $14,250.75 (Size: 16 bytes)\nActive Status: True\nTier: A (Size: 2 bytes)\n\nProcess finished with exit code 0.',
    proTipTitle: 'Double vs Decimal trong phỏng vấn',
    proTipContent:
      'Double dùng biểu diễn nhị phân (IEEE 754) nên dễ sinh sai số làm tròn thập phân. Hãy dùng Decimal cho các bài toán tài chính, tiền tệ.',
  },

  'type-conversion': {
    id: 'type-conversion',
    order: 3,
    title: 'Type Conversion & Casting',
    duration: '9 min',
    chapter: 'Variables and Data Types',
    objectives: [
      'Nắm vững chuyển đổi ngầm định (Implicit Conversion).',
      'Thực hiện ép kiểu tường minh (Explicit Casting).',
      'Sử dụng lớp Convert và phương thức int.Parse / int.TryParse.',
      'Kiểm soát hiện tượng tràn số với từ khóa checked và unchecked.',
    ],
    mainHeading: 'Chuyển đổi kiểu dữ liệu & Ép kiểu an toàn',
    subHeading: 'Tránh lỗi runtime và mất mát dữ liệu khi chuyển đổi',
    description:
      'Chuyển đổi kiểu diễn ra khi gán giá trị của kiểu này sang kiểu khác. Ép kiểu ngầm định diễn ra an toàn tự động, trong khi ép kiểu tường minh có thể gây mất mát số thập phân hoặc tràn dữ liệu.',
    tableData: [
      { keyword: 'long x = intVal;', ctsType: 'Implicit Cast', size: 'Tự động', description: 'An toàn, không bị mất dữ liệu' },
      { keyword: '(int)doubleVal', ctsType: 'Explicit Cast', size: 'Toán tử (type)', description: 'Cắt bỏ phần thập phân' },
      { keyword: 'int.TryParse(...)', ctsType: 'Safe Parse', size: 'Hàm hỗ trợ', description: 'Chuyển đổi chuỗi không ném Exception' },
      { keyword: 'Convert.ToInt32(...)', ctsType: 'Convert Class', size: 'System.Convert', description: 'Tự động làm tròn số và xử lý null' },
    ],
    initialCode: `using System;

public class Program
{
    public static void Main()
    {
        double pi = 3.14159;
        int roundedPi = (int)pi;

        string numberString = "2026";
        if (int.TryParse(numberString, out int parsedYear))
        {
            Console.WriteLine($"Chuyển đổi thành công năm: {parsedYear}");
        }

        Console.WriteLine($"Giá trị ban đầu: {pi}, Sau khi ép về int: {roundedPi}");
    }
}`,
    defaultOutput:
      'Chuyển đổi thành công năm: 2026\nGiá trị ban đầu: 3.14159, Sau khi ép về int: 3\n\nProcess finished with exit code 0.',
    proTipTitle: 'Luôn ưu tiên int.TryParse hơn int.Parse',
    proTipContent:
      'TryParse trả về bool thay vì ném lỗi Exception ra màn hình khi người dùng nhập sai, giúp chương trình chạy mượt mà hơn.',
  },

  'nullable-types': {
    id: 'nullable-types',
    order: 4,
    title: 'Nullable Value Types in C#',
    duration: '12 min',
    chapter: 'Variables and Data Types',
    objectives: [
      'Hiểu vì sao Value Type thông thường không thể nhận giá trị null.',
      'Khai báo Nullable Type với cú pháp T? hoặc Nullable<T>.',
      'Sử dụng toán tử Null-coalescing (??) và (??=).',
      'Truy xuất giá trị an toàn với HasValue và Value.',
    ],
    mainHeading: 'Kiểu giá trị có thể mang giá trị Null (Nullable Types)',
    subHeading: 'Làm việc an toàn với cơ sở dữ liệu và dữ liệu tùy chọn',
    description:
      'Mặc định, Value Types không thể mang giá trị null. Khi làm việc với cơ sở dữ liệu nơi các cột có thể để trống (NULL), C# hỗ trợ Nullable Value Types để biểu thị trạng thái không có dữ liệu.',
    tableData: [
      { keyword: 'int? age = null;', ctsType: 'Nullable<Int32>', size: '5 bytes (4 + 1 flag)', description: 'Chấp nhận cả số nguyên lẫn null' },
      { keyword: 'x ?? defaultValue', ctsType: 'Null-Coalescing', size: 'Toán tử', description: 'Lấy defaultValue nếu x là null' },
      { keyword: 'x ??= defaultValue', ctsType: 'Null-Assignment', size: 'Toán tử C# 8+', description: 'Gán defaultValue nếu x đang là null' },
      { keyword: 'x.HasValue', ctsType: 'Property bool', size: '1 byte', description: 'Kiểm tra xem biến có giá trị thực hay không' },
    ],
    initialCode: `using System;

public class Program
{
    public static void Main()
    {
        int? optionalScore = null;
        int finalScore = optionalScore ?? 100;
        Console.WriteLine($"Điểm chính thức: {finalScore} (Ban đầu: {optionalScore?.ToString() ?? "null"})");

        optionalScore = 85;
        Console.WriteLine($"Sau khi cập nhật: {optionalScore.Value}");
    }
}`,
    defaultOutput:
      'Điểm chính thức: 100 (Ban đầu: null)\nSau khi cập nhật: 85\n\nProcess finished with exit code 0.',
    proTipTitle: 'Tránh lỗi InvalidOperationException',
    proTipContent:
      'Tuyệt đối không gọi thẳng .Value trên biến Nullable khi chưa kiểm tra .HasValue, nếu không chương trình sẽ bị văng lỗi runtime.',
  },
};

export default function LearnerLessonPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug || 'csharp-fundamentals';
  const lessonIdParam = Array.isArray(params?.lessonId) ? params.lessonId[0] : params?.lessonId;

  const [databaseCourseTitle, setDatabaseCourseTitle] = useState<string | null>(null);
  const [databaseChapters, setDatabaseChapters] = useState<LearnerLessonChapter[] | null>(null);

  useEffect(() => {
    let isActive = true;

    courseApi.learnerLessons(slug)
      .then((response) => {
        if (isActive) {
          setDatabaseCourseTitle(response.course.title);
          setDatabaseChapters(response.chapters);
        }
      })
      .catch(() => {
        if (isActive) {
          setDatabaseCourseTitle(null);
          setDatabaseChapters(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [slug]);

  const fallbackCourse = COURSE_MAP[slug] || COURSE_MAP['csharp-fundamentals'];
  const currentCourse = databaseChapters
    ? {
        ...fallbackCourse,
      title: databaseCourseTitle ?? fallbackCourse.title,
        chapters: databaseChapters.map((chapter) => ({
          title: chapter.title,
          lessons: chapter.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            duration: `${lesson.duration} min`,
            completed: false,
          })),
        })),
      }
    : fallbackCourse;
  const courseHref = `/learner/courses/${slug}`;

  // Thu thập danh sách phẳng tất cả bài học trong khóa
  const allCourseLessons: Array<{ id: string; title: string; duration: string; completed: boolean; chapterTitle: string }> = [];
  currentCourse.chapters.forEach((chapter: any) => {
    chapter.lessons.forEach((lesson: any) => {
      allCourseLessons.push({ ...lesson, chapterTitle: chapter.title });
    });
  });

  // Tìm bài học hiện tại (nếu chưa có trong LESSON_DATABASE thì lấy fallback)
  const activeLessonId = lessonIdParam || 'what-is-csharp';
  const currentLessonMeta = allCourseLessons.find((l) => l.id === activeLessonId) || allCourseLessons[0];
  
  const currentLesson: LessonDetail = LESSON_DATABASE[activeLessonId] || {
    id: currentLessonMeta.id,
    order: 1,
    title: currentLessonMeta.title,
    duration: currentLessonMeta.duration,
    chapter: currentLessonMeta.chapterTitle,
    objectives: [
      `Nắm vững khái niệm nền tảng của ${currentLessonMeta.title}.`,
      'Thực hành ví dụ trực quan trong môi trường C# 12.',
      'Phân tích quy trình xử lý của .NET Runtime.',
      'Tránh các bẫy lỗi thường gặp khi đi làm dự án.',
    ],
    mainHeading: currentLessonMeta.title,
    subHeading: `Nội dung hướng dẫn chi tiết thuộc chương ${currentLessonMeta.chapterTitle}`,
    description: `Bài học ${currentLessonMeta.title} giúp bạn xây dựng nền tảng vững chắc khi làm việc với hệ sinh thái .NET. Hãy thực hành từng dòng code trên môi trường IDE bên dưới.`,
    tableData: [
      { keyword: 'Cú pháp', ctsType: 'Chuẩn C# 12', size: 'Tiêu chuẩn', description: 'Cú pháp rõ ràng, dễ bảo trì' },
      { keyword: 'Quản lý bộ nhớ', ctsType: 'CLR Core', size: 'Tự động', description: 'Tối ưu hoá hiệu năng xử lý' },
    ],
    initialCode: `using System;\n\npublic class Program\n{\n    public static void Main()\n    {\n        Console.WriteLine("Bài học: ${currentLessonMeta.title}");\n    }\n}`,
    defaultOutput: `Bài học: ${currentLessonMeta.title}\n\nProcess finished with exit code 0.`,
    proTipTitle: 'Gợi ý học tập',
    proTipContent: 'Hãy tự gõ lại từng dòng mã thay vì sao chép để ghi nhớ cú pháp nhanh hơn.',
  };

  // Bài học thuộc cùng chương hiện tại
  const currentChapterLessons = allCourseLessons.filter((l) => l.chapterTitle === currentLesson.chapter);

  // Điều hướng Bài trước / Bài tiếp theo
  const globalIndex = allCourseLessons.findIndex((item) => item.id === currentLessonMeta.id);
  const prevLesson = globalIndex > 0 ? allCourseLessons[globalIndex - 1] : null;
  const nextLesson = globalIndex < allCourseLessons.length - 1 ? allCourseLessons[globalIndex + 1] : null;

  // Trạng thái tương tác
  const [isCompleted, setIsCompleted] = useState(currentLessonMeta.completed);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string>(currentLesson.defaultOutput);
  const [aiChatInput, setAiChatInput] = useState('');
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: `Chào bạn! Mình có thể hỗ trợ giải thích bất kỳ phần nào trong bài "${currentLesson.title}".`,
    },
  ]);

  // Cập nhật khi đổi bài học
  useEffect(() => {
    setConsoleOutput(currentLesson.defaultOutput);
    setIsCompleted(currentLessonMeta.completed);
    setChatMessages([
      {
        sender: 'ai',
        text: `Chào bạn! Cần giải thích thêm về nội dung bài "${currentLesson.title}" không?`,
      },
    ]);
  }, [activeLessonId, currentLesson.defaultOutput, currentLesson.title, currentLessonMeta.completed]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentLesson.initialCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setConsoleOutput('Đang biên dịch bằng .NET SDK (Roslyn)...');
    setTimeout(() => {
      setIsRunning(false);
      setConsoleOutput(currentLesson.defaultOutput);
    }, 600);
  };

  const handleSendMessage = (customPrompt?: string) => {
    const textToSend = customPrompt || aiChatInput;
    if (!textToSend.trim()) return;

    setChatMessages((prev) => [...prev, { sender: 'user', text: textToSend }]);
    if (!customPrompt) setAiChatInput('');

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Về câu hỏi "${textToSend}": Trong bài học "${currentLesson.title}", vấn đề này liên quan trực tiếp đến ${currentLesson.description.slice(0, 110)}...`,
        },
      ]);
    }, 700);
  };

  // Lấy bài test liên quan
  const currentQuiz = currentCourse.tests?.[0] || {
    id: 'quiz',
    title: 'Quiz kiểm tra nhanh',
    description: '10 câu hỏi trắc nghiệm',
    duration: '15 phút, tính giờ',
  };

  return (
    <div className="min-h-screen bg-[#F7F8F3] text-slate-700 flex flex-col font-sans">
      <div className="mx-auto w-full max-w-[1240px] px-4 pt-0 pb-24 sm:px-6 space-y-5">
        
        {/* Nút quay về độc lập (Đồng bộ với page_7.tsx) */}
        <Link
          href={courseHref}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{currentCourse.title}</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500 font-normal">{currentLesson.chapter}</span>
        </Link>

        {/* Header Card tiêu đề bài học */}
        <div className="rounded-[18px] border border-[#dfe6df] bg-white p-5 sm:p-6 shadow-[0_4px_16px_rgba(0,44,62,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0f3741]">
                {currentLesson.title}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                <span className="rounded-full border border-[#f7d0d0] bg-[#fbe7e9] px-2.5 py-0.5 text-[11px] font-bold text-[#f7444e]">
                  {currentCourse.level}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                  <Clock3 className="h-3 w-3 text-slate-400" />
                  {currentLesson.duration}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span>Tiến độ chương</span>
                  <span className="font-bold text-slate-800">
                    {Math.round(((currentChapterLessons.findIndex((l) => l.id === currentLessonMeta.id) + 1) / currentChapterLessons.length) * 100)}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-32 rounded-full bg-[#f4d0d0] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#f7444e] transition-all duration-300"
                    style={{
                      width: `${((currentChapterLessons.findIndex((l) => l.id === currentLessonMeta.id) + 1) / currentChapterLessons.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold transition ${isBookmarked ? 'bg-rose-50 text-[#f7444e]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                {isBookmarked ? 'Saved' : 'Bookmark'}
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage(`Tóm tắt nội dung bài ${currentLesson.title}`)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <Bot className="h-4 w-4 text-[#F7444E]" />
                Hỏi AI Tutor
              </button>

              <button
                type="button"
                onClick={() => setIsCompleted(!isCompleted)}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition shadow-sm ${
                  isCompleted
                    ? 'bg-[#dff5ea] text-[#2b9e6a] hover:bg-[#d0f0e2] border border-[#a2e5c6]'
                    : 'bg-[#F7444E] text-white hover:bg-[#e33b3b]'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                {isCompleted ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
              </button>
            </div>
          </div>
        </div>

        {/* 3 Cột nội dung */}
        <main className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          {/* CỘT TRÁI: Curriculum & Test Card */}
          <aside className="space-y-5">
            {/* Card mục lục chương */}
            <div className="overflow-hidden rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_4px_16px_rgba(0,44,62,0.04)]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nội dung chương</span>
                <span className="text-xs font-semibold text-slate-400">
                  {currentChapterLessons.findIndex((l) => l.id === currentLessonMeta.id) + 1} / {currentChapterLessons.length} bài
                </span>
              </div>

              <div className="mt-3 space-y-1.5">
                {currentChapterLessons.map((item, index) => {
                  const isCurrent = item.id === currentLessonMeta.id;
                  return (
                    <Link
                      key={item.id}
                      href={`/learner/courses/${slug}/lessons/${item.id}`}
                      className={`flex items-start gap-3 rounded-xl p-2.5 text-xs transition-all ${
                        isCurrent
                          ? 'border border-[#f4b7b7] bg-[#fff3f2] font-semibold text-[#f7444e] shadow-sm'
                          : item.completed
                          ? 'text-slate-700 hover:bg-slate-50 cursor-pointer'
                          : 'text-slate-600 hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {item.completed && !isCurrent ? (
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#dff5ea] text-[#2b9e6a]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </span>
                        ) : isCurrent ? (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#F7444E] text-[10px] font-bold text-white">
                            {index + 1}
                          </span>
                        ) : (
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          </span>
                        )}
                      </span>
                      <div className="flex-1 leading-snug">
                        <p className={isCurrent ? 'text-[#0f3741]' : ''}>{item.title}</p>
                        <span className="text-[11px] text-slate-400">{item.duration}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Card Tests: Đồng bộ từ tests của page_7.tsx */}
            <div className="rounded-[18px] border border-[#dfe6df] bg-[#f8f7f5] p-4 shadow-[0_4px_16px_rgba(0,44,62,0.03)]">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>{currentQuiz.title}</span>
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                {currentQuiz.description} • {currentQuiz.duration}
              </p>
              <Link
                href={`/learner/courses/${slug}/tests/${currentQuiz.id}`}
                className="mt-3 block w-full text-center rounded-xl bg-[#F7444E] py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#e33b3b]"
              >
                Start test
              </Link>
            </div>
          </aside>

          {/* CỘT GIỮA: Nội dung bài học & Code Runner */}
          <section className="space-y-6">
            {/* Mục tiêu bài học */}
            <div className="rounded-[18px] border border-[#d6e3e7] bg-[#f2f8fa] p-5 shadow-[0_4px_16px_rgba(0,44,62,0.02)]">
              <div className="flex items-center gap-2.5 text-sm font-bold text-[#0f3741]">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#78bcc4] shadow-sm">
                  <Layers className="h-4 w-4" />
                </span>
                <span>Mục tiêu bài học (Lesson Objectives)</span>
              </div>
              <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-2 text-xs text-slate-600">
                {currentLesson.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 mt-1.5 rounded-full bg-[#F7444E] shrink-0" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bài viết chi tiết */}
            <div className="rounded-[18px] border border-[#dfe6df] bg-white p-6 sm:p-8 shadow-[0_4px_16px_rgba(0,44,62,0.04)] space-y-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f7444e]">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#0f3741]">
                    {currentLesson.mainHeading}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{currentLesson.subHeading}</p>
                </div>
              </div>

              <p className="text-[15px] leading-7 text-slate-600">{currentLesson.description}</p>

              {/* Bảng dữ liệu */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#fafafa]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-[#f2f5f4] text-slate-700 font-bold">
                        <th className="p-3">Thành phần / Cú pháp</th>
                        <th className="p-3">Kiểu / Cơ chế .NET</th>
                        <th className="p-3">Kích thước</th>
                        <th className="p-3">Mô tả chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80 font-mono text-[12px] text-slate-600 bg-white">
                      {currentLesson.tableData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="p-3 text-[#F7444E] font-bold">{row.keyword}</td>
                          <td className="p-3 text-slate-500">{row.ctsType}</td>
                          <td className="p-3">{row.size}</td>
                          <td className="p-3 font-sans">{row.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Code Runner IDE */}
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0d131a] shadow-lg">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-[#161f28] px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                      <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                      <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                    </div>
                    <div className="flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300 border border-slate-750">
                      <Code2 className="h-3.5 w-3.5 text-[#F7444E]" />
                      <span>Program.cs</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendMessage(`Giải thích chi tiết mã Program.cs của bài ${currentLesson.title}`)}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
                    >
                      <Sparkles className="h-3 w-3 text-amber-400" /> Giải thích
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" /> Đã chép
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleRunCode}
                      disabled={isRunning}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7444E] px-3.5 py-1 text-xs font-bold text-white hover:bg-[#e33b3b] transition disabled:opacity-50"
                    >
                      <Play className="h-3 w-3 fill-white" />
                      {isRunning ? 'Đang chạy...' : 'Chạy mã'}
                    </button>
                  </div>
                </div>

                <div className="p-4 font-mono text-xs leading-relaxed text-slate-200 overflow-x-auto bg-[#0a0f14]">
                  <pre>
                    <code>{currentLesson.initialCode}</code>
                  </pre>
                </div>

                <div className="border-t border-slate-800 bg-[#060a0e] p-3 font-mono text-xs">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1.5 font-sans font-semibold">
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Terminal Output:</span>
                  </div>
                  <pre className="whitespace-pre-wrap text-emerald-400/90 text-[11px] leading-relaxed">
                    {consoleOutput}
                  </pre>
                </div>
              </div>

              {/* Mẹo phỏng vấn */}
              <div className="rounded-xl border border-amber-200 bg-[#fffbeb] p-4 text-xs text-amber-900 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span>{currentLesson.proTipTitle}</span>
                </div>
                <p className="mt-1.5 leading-relaxed text-amber-800/90">{currentLesson.proTipContent}</p>
              </div>
            </div>
          </section>

          {/* CỘT PHẢI: AI Tutor, Instructor & Resources (Đồng bộ với page_7.tsx) */}
          <aside className="space-y-5">
            {/* AI Tutor Chat Widget */}
            <div className="rounded-[18px] border border-[#dfe6df] bg-white flex flex-col h-[380px] shadow-[0_4px_16px_rgba(0,44,62,0.04)] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-[#fbfbf9]">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-[#F7444E]">
                    <Bot className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-[#0f3741]">Trợ lý AI Tutor</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                  C# 12 Expert
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#F7444E] text-white font-medium rounded-br-none'
                          : 'bg-[#f4f7f6] text-slate-700 border border-[#e1e8e6] rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 px-3 py-2 flex flex-wrap gap-1.5 bg-[#fdfdfc]">
                <button
                  type="button"
                  onClick={() => handleSendMessage(`Trọng tâm kiến thức của bài ${currentLesson.title}`)}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-[#F7444E] hover:text-[#F7444E] transition"
                >
                  Trọng tâm bài học?
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('Ví dụ thực tế trong dự án')}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-[#F7444E] hover:text-[#F7444E] transition"
                >
                  Ví dụ thực tế?
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-2.5 border-t border-slate-100 flex gap-2 bg-white"
              >
                <input
                  type="text"
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  placeholder="Đặt câu hỏi cho AI..."
                  className="flex-1 rounded-xl border border-slate-200 bg-[#f8f9f7] px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#F7444E] focus:outline-none focus:bg-white"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[#F7444E] px-3 py-1.5 text-white hover:bg-[#e33b3b] transition flex items-center justify-center shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

            {/* Card Instructor: Đồng bộ chính xác từ page_7.tsx */}
            <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_4px_16px_rgba(0,44,62,0.04)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Instructor</h3>
              <div className="mt-3 flex items-center gap-3 rounded-[12px] border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dfeff5] text-sm font-bold text-slate-700">
                  DL
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-[#0f3741]">{currentCourse.instructor}</div>
                  <div className="truncate text-[11px] text-slate-500">{currentCourse.instructorRole}</div>
                </div>
                <span className="inline-flex rounded-full bg-blue-50 p-1 text-blue-500">
                  <Award className="h-4 w-4" />
                </span>
              </div>
            </div>

            {/* Card Resources: Đồng bộ chính xác từ page_7.tsx */}
            <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_4px_16px_rgba(0,44,62,0.04)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Resources</h3>
              <div className="mt-3 space-y-2">
                {currentCourse.resources?.map((resource: any) => (
                  <div
                    key={resource.name}
                    className="flex items-center gap-3 rounded-[12px] border border-slate-200 bg-[#f8f7f5] p-2.5 transition hover:bg-slate-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                      {resource.isVideo ? (
                        <Video className="h-4 w-4 text-blue-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-[#F7444E]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-slate-800">{resource.name}</div>
                      <div className="text-[10px] text-slate-500">{resource.type}</div>
                    </div>
                    <Download className="h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-700" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </main>
      </div>

      {/* FOOTER ĐIỀU HƯỚNG BÀI TRƯỚC / TIẾP THEO */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#dfe6df] bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6 shadow-[0_-4px_16px_rgba(0,44,62,0.03)]">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between">
          {prevLesson ? (
            <Link
              href={`/learner/courses/${slug}/lessons/${prevLesson.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bài trước: {prevLesson.title}</span>
              <span className="sm:hidden">Bài trước</span>
            </Link>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <Link
              href={courseHref}
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              Mục lục khóa học
            </Link>

            {nextLesson ? (
              <Link
                href={`/learner/courses/${slug}/lessons/${nextLesson.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#e33b3b] transition shadow-sm"
              >
                <span>Bài tiếp theo: {nextLesson.title}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <Link
                href={courseHref}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-sm"
              >
                <span>Hoàn thành khóa học</span>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </footer>

      {/* Note FAB */}
      <button
        onClick={() => setIsNoteOpen(true)}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#0f3741] text-white shadow-lg transition hover:scale-105 hover:bg-[#145a68]"
        title="Ghi chú bài học"
      >
        <Edit3 className="h-6 w-6" />
      </button>

      {/* Note Drawer */}
      {isNoteOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setIsNoteOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-slate-200 bg-white shadow-2xl transition-transform ease-[cubic-bezier(0.32,0.72,0,1)] duration-500 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0f3741]">My Notes</h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{currentLesson.title}</p>
                </div>
              </div>
              <button onClick={() => setIsNoteOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 p-6 flex flex-col">
              <textarea
                value={noteContent}
                onChange={(e) => {
                  setNoteContent(e.target.value);
                  setIsSavingNote(true);
                  setTimeout(() => setIsSavingNote(false), 1000);
                }}
                placeholder="Type your notes here... (Supports Markdown)"
                className="flex-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 placeholder-slate-400 focus:border-[#78bcc4] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#78bcc4]/10"
              />
            </div>
            
            <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                {isSavingNote ? (
                  <span className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Saving...</span>
                ) : (
                  <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Saved</span>
                )}
              </div>
              <Link href="/learner/notes" className="text-xs font-semibold text-[#f7444e] hover:text-rose-600 transition">
                View all notes →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}