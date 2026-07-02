import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { ListAcademyDto } from './dto/list-academy.dto';

interface JwtRequestUser {
  sub: string;
  orgId: string | null;
  role: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class AcademyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getDashboard(user: JwtRequestUser) {
    const organizationId = this.requireOrganization(user);

    const [assigned, completed, certificates, expiringSoon, activeEnrollments, hours] = await Promise.all([
      this.prisma.academyEnrollment.count({
        where: {
          organizationId,
          userId: user.sub,
          status: {
            in: ['ASSIGNED', 'IN_PROGRESS'],
          },
        },
      }),
      this.prisma.academyEnrollment.count({
        where: {
          organizationId,
          userId: user.sub,
          status: 'COMPLETED',
        },
      }),
      this.prisma.academyCertificate.count({
        where: {
          organizationId,
          userId: user.sub,
          status: 'ACTIVE',
        },
      }),
      this.prisma.academyCertificate.count({
        where: {
          organizationId,
          userId: user.sub,
          status: 'ACTIVE',
          expiresAt: {
            lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          },
        },
      }),
      this.prisma.academyEnrollment.findMany({
        where: {
          organizationId,
          userId: user.sub,
          status: {
            in: ['ASSIGNED', 'IN_PROGRESS'],
          },
        },
        select: {
          id: true,
          status: true,
          progressPercent: true,
          hoursCompleted: true,
          dueAt: true,
          managerComments: true,
          updatedAt: true,
          course: {
            select: {
              id: true,
              title: true,
            },
          },
          learningPath: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 10,
      }),
      this.prisma.academyEnrollment.aggregate({
        _sum: {
          hoursCompleted: true,
        },
        where: {
          organizationId,
          userId: user.sub,
        },
      }),
    ]);

    return {
      coursesAssigned: assigned,
      coursesCompleted: completed,
      coursesRemaining: Math.max(assigned - completed, 0),
      certificatesEarned: certificates,
      upcomingRenewals: expiringSoon,
      trainingProgress: assigned === 0 ? 0 : Math.round((completed / Math.max(assigned, 1)) * 100),
      hoursCompleted: hours._sum.hoursCompleted ?? 0,
      recentActivity: activeEnrollments,
    };
  }

  async listCourseCatalog(user: JwtRequestUser, query: ListAcademyDto): Promise<PaginatedResult<unknown>> {
    const organizationId = this.requireOrganization(user);
    const where: Prisma.AcademyCourseWhereInput = {
      organizationId,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { summary: { contains: query.search, mode: 'insensitive' } },
              { tags: { has: query.search } },
            ],
          }
        : {}),
      ...(query.category
        ? {
            category: {
              slug: query.category,
            },
          }
        : {}),
      ...(query.status
        ? {
            status: query.status as Prisma.EnumAcademyContentStatusFilter['equals'],
          }
        : {}),
      ...(query.difficulty
        ? {
            difficulty: query.difficulty as Prisma.EnumAcademyDifficultyFilter['equals'],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.academyCourse.count({ where }),
      this.prisma.academyCourse.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          instructor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              lessons: true,
            },
          },
        },
        skip: this.offset(query.page, query.limit),
        take: query.limit,
        orderBy: this.courseOrderBy(query),
      }),
    ]);

    return this.paginate(items, query.page, query.limit, total);
  }

  async listLearningPaths(user: JwtRequestUser, query: ListAcademyDto): Promise<PaginatedResult<unknown>> {
    const organizationId = this.requireOrganization(user);
    const where: Prisma.AcademyLearningPathWhereInput = {
      organizationId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.status
        ? {
            status: query.status as Prisma.EnumAcademyContentStatusFilter['equals'],
          }
        : {}),
      ...(query.difficulty
        ? {
            difficulty: query.difficulty as Prisma.EnumAcademyDifficultyFilter['equals'],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.academyLearningPath.count({ where }),
      this.prisma.academyLearningPath.findMany({
        where,
        include: {
          courses: {
            select: {
              id: true,
              orderIndex: true,
              isRequired: true,
              course: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
            },
            orderBy: {
              orderIndex: 'asc',
            },
          },
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
        skip: this.offset(query.page, query.limit),
        take: query.limit,
        orderBy: {
          [query.sortBy ?? 'updatedAt']: query.sortOrder,
        },
      }),
    ]);

    return this.paginate(items, query.page, query.limit, total);
  }

  async listKnowledgeBase(
    user: JwtRequestUser,
    query: ListAcademyDto,
    type?: Prisma.EnumAcademyKnowledgeTypeFilter['equals'],
  ): Promise<PaginatedResult<unknown>> {
    const organizationId = this.requireOrganization(user);
    const where: Prisma.AcademyKnowledgeArticleWhereInput = {
      organizationId,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { body: { contains: query.search, mode: 'insensitive' } },
              { tags: { has: query.search } },
            ],
          }
        : {}),
      ...(query.category
        ? {
            category: {
              equals: query.category,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.status
        ? {
            status: query.status as Prisma.EnumAcademyContentStatusFilter['equals'],
          }
        : {}),
      ...(type
        ? {
            type,
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.academyKnowledgeArticle.count({ where }),
      this.prisma.academyKnowledgeArticle.findMany({
        where,
        include: {
          _count: {
            select: {
              bookmarks: true,
            },
          },
        },
        skip: this.offset(query.page, query.limit),
        take: query.limit,
        orderBy: {
          [query.sortBy ?? 'updatedAt']: query.sortOrder,
        },
      }),
    ]);

    return this.paginate(items, query.page, query.limit, total);
  }

  async listSops(user: JwtRequestUser, query: ListAcademyDto): Promise<PaginatedResult<unknown>> {
    const organizationId = this.requireOrganization(user);

    const where: Prisma.AcademySopWhereInput = {
      organizationId,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { instructions: { contains: query.search, mode: 'insensitive' } },
              { sopNumber: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.category
        ? {
            department: {
              equals: query.category,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.status
        ? {
            status: query.status as Prisma.EnumAcademyContentStatusFilter['equals'],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.academySop.count({ where }),
      this.prisma.academySop.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip: this.offset(query.page, query.limit),
        take: query.limit,
        orderBy: {
          [query.sortBy ?? 'updatedAt']: query.sortOrder,
        },
      }),
    ]);

    return this.paginate(items, query.page, query.limit, total);
  }

  async listManuals(user: JwtRequestUser, query: ListAcademyDto): Promise<PaginatedResult<unknown>> {
    const organizationId = this.requireOrganization(user);

    const where: Prisma.AcademyManualWhereInput = {
      organizationId,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { manualType: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.status
        ? {
            status: query.status as Prisma.EnumAcademyContentStatusFilter['equals'],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.academyManual.count({ where }),
      this.prisma.academyManual.findMany({
        where,
        include: {
          _count: {
            select: {
              chapters: true,
            },
          },
        },
        skip: this.offset(query.page, query.limit),
        take: query.limit,
        orderBy: {
          [query.sortBy ?? 'updatedAt']: query.sortOrder,
        },
      }),
    ]);

    return this.paginate(items, query.page, query.limit, total);
  }

  async listAssets(user: JwtRequestUser, query: ListAcademyDto, type: 'VIDEO' | 'FORM' | 'DOWNLOAD' | 'PDF') {
    const organizationId = this.requireOrganization(user);

    const where: Prisma.AcademyAssetWhereInput = {
      organizationId,
      assetType: type,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { tags: { has: query.search } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.academyAsset.count({ where }),
      this.prisma.academyAsset.findMany({
        where,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
        skip: this.offset(query.page, query.limit),
        take: query.limit,
        orderBy: {
          [query.sortBy ?? 'updatedAt']: query.sortOrder,
        },
      }),
    ]);

    return this.paginate(items, query.page, query.limit, total);
  }

  async listCertifications(user: JwtRequestUser, query: ListAcademyDto): Promise<PaginatedResult<unknown>> {
    const organizationId = this.requireOrganization(user);

    const where: Prisma.AcademyCertificateWhereInput = {
      organizationId,
      ...(query.search
        ? {
            OR: [
              { verificationNumber: { contains: query.search, mode: 'insensitive' } },
              {
                user: {
                  OR: [
                    { firstName: { contains: query.search, mode: 'insensitive' } },
                    { lastName: { contains: query.search, mode: 'insensitive' } },
                    { email: { contains: query.search, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        : {}),
      ...(query.status
        ? {
            status: query.status as Prisma.EnumAcademyCertificateStatusFilter['equals'],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.academyCertificate.count({ where }),
      this.prisma.academyCertificate.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
            },
          },
          learningPath: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip: this.offset(query.page, query.limit),
        take: query.limit,
        orderBy: {
          [query.sortBy ?? 'createdAt']: query.sortOrder,
        },
      }),
    ]);

    return this.paginate(items, query.page, query.limit, total);
  }

  async getInstructorDashboard(user: JwtRequestUser) {
    const organizationId = this.requireOrganization(user);

    const [coursesOwned, pendingApprovals, activeStudents, pendingExamReview] = await Promise.all([
      this.prisma.academyCourse.count({
        where: {
          organizationId,
          instructorId: user.sub,
        },
      }),
      this.prisma.academyCourse.count({
        where: {
          organizationId,
          status: 'DRAFT',
          instructorId: user.sub,
        },
      }),
      this.prisma.academyEnrollment.count({
        where: {
          organizationId,
          status: {
            in: ['ASSIGNED', 'IN_PROGRESS'],
          },
          course: {
            instructorId: user.sub,
          },
        },
      }),
      this.prisma.academyExamAttempt.count({
        where: {
          organizationId,
          submittedAt: null,
          exam: {
            course: {
              instructorId: user.sub,
            },
          },
        },
      }),
    ]);

    return {
      coursesOwned,
      pendingApprovals,
      activeStudents,
      pendingExamReview,
    };
  }

  async getOrganizationTraining(user: JwtRequestUser) {
    const organizationId = this.requireOrganization(user);

    const [assigned, completed, overdue, certificates] = await Promise.all([
      this.prisma.academyEnrollment.count({
        where: {
          organizationId,
          status: {
            in: ['ASSIGNED', 'IN_PROGRESS'],
          },
        },
      }),
      this.prisma.academyEnrollment.count({
        where: {
          organizationId,
          status: 'COMPLETED',
        },
      }),
      this.prisma.academyEnrollment.count({
        where: {
          organizationId,
          dueAt: {
            lt: new Date(),
          },
          status: {
            in: ['ASSIGNED', 'IN_PROGRESS'],
          },
        },
      }),
      this.prisma.academyCertificate.count({
        where: {
          organizationId,
          status: 'ACTIVE',
        },
      }),
    ]);

    return {
      assignedCourses: assigned,
      completedCourses: completed,
      overdueCourses: overdue,
      activeCertificates: certificates,
      complianceRate: assigned === 0 ? 100 : Math.round((completed / Math.max(assigned, 1)) * 100),
    };
  }

  async getComplianceDashboard(user: JwtRequestUser) {
    const organizationId = this.requireOrganization(user);

    const [requiredPaths, completedRequiredPaths, certRenewals] = await Promise.all([
      this.prisma.academyLearningPath.count({
        where: {
          organizationId,
          status: 'PUBLISHED',
          requiredForRoles: {
            isEmpty: false,
          },
        },
      }),
      this.prisma.academyEnrollment.count({
        where: {
          organizationId,
          status: 'COMPLETED',
          learningPath: {
            requiredForRoles: {
              isEmpty: false,
            },
          },
        },
      }),
      this.prisma.academyCertificate.count({
        where: {
          organizationId,
          status: 'ACTIVE',
          expiresAt: {
            lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
          },
        },
      }),
    ]);

    return {
      requiredLearningPaths: requiredPaths,
      completedRequiredLearningPaths: completedRequiredPaths,
      certificationsRequiringRenewal: certRenewals,
      complianceIndex:
        requiredPaths === 0 ? 100 : Math.min(100, Math.round((completedRequiredPaths / requiredPaths) * 100)),
    };
  }

  async listTestingCenter(user: JwtRequestUser, query: ListAcademyDto): Promise<PaginatedResult<unknown>> {
    const organizationId = this.requireOrganization(user);

    const where: Prisma.AcademyExamWhereInput = {
      organizationId,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { course: { title: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(query.status
        ? {
            status: query.status as Prisma.EnumAcademyContentStatusFilter['equals'],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.academyExam.count({ where }),
      this.prisma.academyExam.findMany({
        where,
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              questions: true,
              attempts: true,
            },
          },
        },
        skip: this.offset(query.page, query.limit),
        take: query.limit,
        orderBy: {
          [query.sortBy ?? 'updatedAt']: query.sortOrder,
        },
      }),
    ]);

    return this.paginate(items, query.page, query.limit, total);
  }

  async listAnnouncements(user: JwtRequestUser, query: ListAcademyDto): Promise<PaginatedResult<unknown>> {
    const organizationId = this.requireOrganization(user);

    const where: Prisma.AcademyKnowledgeArticleWhereInput = {
      organizationId,
      type: 'ARTICLE',
      status: 'PUBLISHED',
      ...(query.search
        ? {
            title: {
              contains: query.search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.academyKnowledgeArticle.count({ where }),
      this.prisma.academyKnowledgeArticle.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: this.offset(query.page, query.limit),
        take: query.limit,
        orderBy: {
          [query.sortBy ?? 'updatedAt']: query.sortOrder,
        },
      }),
    ]);

    await this.auditService.record({
      action: 'academy.announcements.viewed',
      entityType: 'AcademyAnnouncement',
      entityId: organizationId,
      userId: user.sub,
      organizationId,
      metadata: {
        page: query.page,
        limit: query.limit,
      },
    });

    return this.paginate(items, query.page, query.limit, total);
  }

  private requireOrganization(user: JwtRequestUser): string {
    if (!user.orgId) {
      throw new ForbiddenException('User is not scoped to an organization');
    }

    return user.orgId;
  }

  private offset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  private paginate<T>(items: T[], page: number, limit: number, total: number): PaginatedResult<T> {
    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / Math.max(limit, 1))),
    };
  }

  private courseOrderBy(query: ListAcademyDto): Prisma.AcademyCourseOrderByWithRelationInput {
    const sortBy = query.sortBy ?? 'updatedAt';

    if (sortBy === 'title') {
      return {
        title: query.sortOrder,
      };
    }

    if (sortBy === 'estimatedMinutes') {
      return {
        estimatedMinutes: query.sortOrder,
      };
    }

    if (sortBy === 'difficulty') {
      return {
        difficulty: query.sortOrder,
      };
    }

    return {
      updatedAt: query.sortOrder,
    };
  }
}
