import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RateLimit } from '@/reliability/rate-limit.decorator';
import { AcademyService } from './academy.service';
import { ListAcademyDto } from './dto/list-academy.dto';

interface JwtRequestUser {
  sub: string;
  orgId: string | null;
  role: string;
}

@Controller('academy')
@UseGuards(JwtAuthGuard)
@RateLimit('light')
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  @Get('dashboard')
  async dashboard(@Req() request: { user: JwtRequestUser }): Promise<unknown> {
    return this.academyService.getDashboard(request.user);
  }

  @Get('course-catalog')
  async courseCatalog(@Req() request: { user: JwtRequestUser }, @Query() query: ListAcademyDto): Promise<unknown> {
    return this.academyService.listCourseCatalog(request.user, query);
  }

  @Get('learning-paths')
  async learningPaths(@Req() request: { user: JwtRequestUser }, @Query() query: ListAcademyDto): Promise<unknown> {
    return this.academyService.listLearningPaths(request.user, query);
  }

  @Get('knowledge-base')
  async knowledgeBase(@Req() request: { user: JwtRequestUser }, @Query() query: ListAcademyDto): Promise<unknown> {
    return this.academyService.listKnowledgeBase(request.user, query);
  }

  @Get('sops')
  async sops(@Req() request: { user: JwtRequestUser }, @Query() query: ListAcademyDto): Promise<unknown> {
    return this.academyService.listSops(request.user, query);
  }

  @Get('operational-manuals')
  async operationalManuals(@Req() request: { user: JwtRequestUser }, @Query() query: ListAcademyDto): Promise<unknown> {
    return this.academyService.listManuals(request.user, query);
  }

  @Get('video-library')
  async videoLibrary(@Req() request: { user: JwtRequestUser }, @Query() query: ListAcademyDto): Promise<unknown> {
    return this.academyService.listAssets(request.user, query, 'VIDEO');
  }

  @Get('policies')
  async policies(@Req() request: { user: JwtRequestUser }, @Query() query: ListAcademyDto): Promise<unknown> {
    return this.academyService.listKnowledgeBase(request.user, query, 'POLICY');
  }

  @Get('forms')
  async forms(@Req() request: { user: JwtRequestUser }, @Query() query: ListAcademyDto): Promise<unknown> {
    return this.academyService.listAssets(request.user, query, 'FORM');
  }

  @Get('downloads')
  async downloads(@Req() request: { user: JwtRequestUser }, @Query() query: ListAcademyDto): Promise<unknown> {
    return this.academyService.listAssets(request.user, query, 'DOWNLOAD');
  }

  @Get('testing-center')
  async testingCenter(@Req() request: { user: JwtRequestUser }, @Query() query: ListAcademyDto): Promise<unknown> {
    return this.academyService.listTestingCenter(request.user, query);
  }

  @Get('certification-center')
  async certificationCenter(@Req() request: { user: JwtRequestUser }, @Query() query: ListAcademyDto): Promise<unknown> {
    return this.academyService.listCertifications(request.user, query);
  }

  @Get('progress-tracking')
  async progressTracking(@Req() request: { user: JwtRequestUser }): Promise<unknown> {
    return this.academyService.getDashboard(request.user);
  }

  @Get('instructor-dashboard')
  async instructorDashboard(@Req() request: { user: JwtRequestUser }): Promise<unknown> {
    return this.academyService.getInstructorDashboard(request.user);
  }

  @Get('organization-training')
  async organizationTraining(@Req() request: { user: JwtRequestUser }): Promise<unknown> {
    return this.academyService.getOrganizationTraining(request.user);
  }

  @Get('compliance-dashboard')
  async complianceDashboard(@Req() request: { user: JwtRequestUser }): Promise<unknown> {
    return this.academyService.getComplianceDashboard(request.user);
  }

  @Get('announcements')
  async announcements(@Req() request: { user: JwtRequestUser }, @Query() query: ListAcademyDto): Promise<unknown> {
    return this.academyService.listAnnouncements(request.user, query);
  }

  @Get('academy-administration')
  async administration(@Req() request: { user: JwtRequestUser }): Promise<unknown> {
    const [organization, instructor, compliance] = await Promise.all([
      this.academyService.getOrganizationTraining(request.user),
      this.academyService.getInstructorDashboard(request.user),
      this.academyService.getComplianceDashboard(request.user),
    ]);

    return {
      organization,
      instructor,
      compliance,
    };
  }
}
