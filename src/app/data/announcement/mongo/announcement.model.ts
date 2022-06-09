import { Document, Model, model } from 'mongoose';
import { announcementSchema } from './announcement.schema';

export interface IAnnouncementModel extends Document {
    // Announcement Content
    userId: string;
    title: string;
    description: string;
    schoolId: string;
    // SELECTED USERS
    selectedSegment?: string;
    allGradesAndSections?: boolean;
    allUsersSelected?: boolean;
    shareWithGradesAndSections?: string[];
    selectedUsers?: string[];
    shareWithAllInstructors?: boolean;
    selectedInstructors?: string[];
    shareWithAllAdmins?: boolean;
    selectedAdmins?: string[];
    createdAt: string;
}

export const AnnouncementModel: Model<IAnnouncementModel> = model<IAnnouncementModel>(
    'announcements',
    announcementSchema
);
