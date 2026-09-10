import {
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	MinLength,
} from 'class-validator';

export class UpdateCategoryDto {
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@MinLength(3)
	@MaxLength(120)
	name?: string;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@MaxLength(140)
	@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
	slug?: string;

	@IsOptional()
	@IsString()
	@MaxLength(1000)
	description?: string;
}
