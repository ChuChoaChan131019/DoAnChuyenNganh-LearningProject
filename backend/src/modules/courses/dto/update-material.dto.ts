import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateMaterialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;
}
