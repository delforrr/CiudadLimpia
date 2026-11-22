import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsObject,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ClavesPushDto {
  @ApiProperty() @Matches(/^[A-Za-z0-9_-]{87}$/) p256dh!: string;
  @ApiProperty() @Matches(/^[A-Za-z0-9_-]{22}$/) auth!: string;
}

export class GuardarSuscripcionPushDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() direccionId!: string;
  @ApiProperty({ format: 'uri', maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  endpoint!: string;
  @ApiProperty({ type: ClavesPushDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ClavesPushDto)
  keys!: ClavesPushDto;
}

export class SuscripcionPushResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) direccionId!: string;
}

export class ConfiguracionPushDto {
  @ApiProperty() clavePublica!: string;
}
