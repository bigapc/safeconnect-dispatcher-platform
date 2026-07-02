"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.academyEvents = exports.academySectionMap = exports.academySections = void 0;
exports.academySections = [
    { slug: 'dashboard', label: 'Dashboard', endpoint: '/academy/dashboard', mode: 'summary' },
    { slug: 'course-catalog', label: 'Course Catalog', endpoint: '/academy/course-catalog', mode: 'paginated' },
    { slug: 'learning-paths', label: 'Learning Paths', endpoint: '/academy/learning-paths', mode: 'paginated' },
    { slug: 'courses', label: 'Courses', endpoint: '/academy/course-catalog', mode: 'paginated' },
    { slug: 'lessons', label: 'Lessons', endpoint: '/academy/course-catalog', mode: 'paginated' },
    { slug: 'video-library', label: 'Video Library', endpoint: '/academy/video-library', mode: 'paginated' },
    {
        slug: 'operational-manuals',
        label: 'Operational Manuals',
        endpoint: '/academy/operational-manuals',
        mode: 'paginated',
    },
    {
        slug: 'standard-operating-procedures',
        label: 'Standard Operating Procedures (SOP)',
        endpoint: '/academy/sops',
        mode: 'paginated',
    },
    { slug: 'knowledge-base', label: 'Knowledge Base', endpoint: '/academy/knowledge-base', mode: 'paginated' },
    { slug: 'policies', label: 'Policies', endpoint: '/academy/policies', mode: 'paginated' },
    { slug: 'forms', label: 'Forms', endpoint: '/academy/forms', mode: 'paginated' },
    { slug: 'downloads', label: 'Downloads', endpoint: '/academy/downloads', mode: 'paginated' },
    { slug: 'testing-center', label: 'Testing Center', endpoint: '/academy/testing-center', mode: 'paginated' },
    {
        slug: 'certification-center',
        label: 'Certification Center',
        endpoint: '/academy/certification-center',
        mode: 'paginated',
    },
    {
        slug: 'progress-tracking',
        label: 'Progress Tracking',
        endpoint: '/academy/progress-tracking',
        mode: 'summary',
    },
    {
        slug: 'instructor-dashboard',
        label: 'Instructor Dashboard',
        endpoint: '/academy/instructor-dashboard',
        mode: 'summary',
    },
    {
        slug: 'organization-training',
        label: 'Organization Training',
        endpoint: '/academy/organization-training',
        mode: 'summary',
    },
    {
        slug: 'compliance-dashboard',
        label: 'Compliance Dashboard',
        endpoint: '/academy/compliance-dashboard',
        mode: 'summary',
    },
    {
        slug: 'academy-administration',
        label: 'Academy Administration',
        endpoint: '/academy/academy-administration',
        mode: 'summary',
    },
];
exports.academySectionMap = new Map(exports.academySections.map((section) => [section.slug, section]));
exports.academyEvents = {
    courseCompleted: 'academy.course.completed',
    certificateIssued: 'academy.certificate.issued',
};
//# sourceMappingURL=index.js.map