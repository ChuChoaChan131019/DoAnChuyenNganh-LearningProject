import { IsString, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TaskDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsString()
  status: string;
}

export class TasksResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  active: TaskDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  overdue: TaskDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  upcoming: TaskDto[];
}
