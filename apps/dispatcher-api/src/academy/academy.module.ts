import { Module } from '@nestjs/common';
import { AuditService } from '@/audit/audit.service';
import { UserRepository } from '@/repositories/user.repository';
import { AcademyController } from './academy.controller';
import { AcademyService } from './academy.service';

@Module({
  controllers: [AcademyController],
  providers: [AcademyService, AuditService, UserRepository],
})
export class AcademyModule {}
