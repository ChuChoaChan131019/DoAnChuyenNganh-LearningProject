import { Transform, Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class UpdateAdminAccountDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @MaxLength(254)
  email!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Vui lòng nhập họ tên.' })
  @MaxLength(100)
  fullName!: string;
}

export class CreateContentManagerDto extends UpdateAdminAccountDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};'":\\|<>?,./`~]).+$/s, {
    message: 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.',
  })
  password!: string;
}

export class AccountStatusDto {
  @IsIn(['active', 'disabled'])
  status!: 'active' | 'disabled';
}

export class ListAdminAccountsDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search = '';

  @IsOptional()
  @IsIn(['all', 'learner', 'content_manager', 'admin'])
  role = 'all';

  @IsOptional()
  @IsIn(['all', 'active', 'disabled'])
  status = 'all';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000000)
  offset = 0;
}
