export type AcademySectionMode = 'paginated' | 'summary';
export interface AcademySection {
    slug: string;
    label: string;
    endpoint: string | null;
    mode: AcademySectionMode;
}
export declare const academySections: AcademySection[];
export declare const academySectionMap: Map<string, AcademySection>;
export declare const academyEvents: {
    readonly courseCompleted: "academy.course.completed";
    readonly certificateIssued: "academy.certificate.issued";
};
export type AcademyEventName = (typeof academyEvents)[keyof typeof academyEvents];
