import { Arg, Field, ObjectType } from 'type-graphql';
import { AnnouncementModel } from './mongo/announcement.model';
import { AnnouncementInput } from './input-types/AnnouncementInput.type';
import { ActivityModel } from '../activity/mongo/activity.model';
import { UserModel } from '../user/mongo/User.model';
import { convert } from 'html-to-text';

/**
 * Date Mutation Endpoints
 */
@ObjectType()
export class AnnouncementMutationResolver {
    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async create(@Arg('announcementInput', (type) => AnnouncementInput) announcementInput: AnnouncementInput) {
        try {
            const {
                userId,
                title,
                description,
                schoolId,
                selectedSegment,
                allGradesAndSections,
                allUsersSelected,
                shareWithGradesAndSections,
                selectedUsers,
                shareWithAllInstructors,
                selectedInstructors,
                shareWithAllAdmins,
                selectedAdmins,
            } = announcementInput;

            const createAnnouncement = await AnnouncementModel.create({
                userId,
                title,
                description,
                schoolId,
                selectedSegment,
                allGradesAndSections,
                allUsersSelected,
                shareWithGradesAndSections,
                selectedUsers,
                shareWithAllInstructors,
                selectedInstructors,
                shareWithAllAdmins,
                selectedAdmins,
            });

            const subtitle = convert(description);

            if (!createAnnouncement) return false;

            // Add announcement to alerts for Students and Instructors as Activity Objects

            if (selectedSegment !== null && selectedSegment !== undefined) {
                // Check if shared with students
                if (selectedSegment === 'both' || selectedSegment === 'students') {
                    const studentActivities: any[] = [];

                    if (allGradesAndSections && allUsersSelected) {
                        // ALL SCHOOL STUDENTS
                        const fetchAllStudents = await UserModel.find({
                            schoolId,
                            role: 'student',
                            deletedAt: undefined,
                        });

                        if (fetchAllStudents) {
                            fetchAllStudents.map((s: any) => {
                                const student = s.toObject();
                                studentActivities.push({
                                    userId: student._id,
                                    title,
                                    subtitle,
                                    status: 'unread',
                                    date: new Date(),
                                    announcementId: createAnnouncement._id,
                                    target: 'ANNOUNCEMENT',
                                });
                            });
                        }
                    } else if (!allGradesAndSections && allUsersSelected && shareWithGradesAndSections) {
                        // ALL STUDENTS FOR SELECTED SECTIONS

                        for (let i = 0; i < shareWithGradesAndSections.length; i++) {
                            const gradeAndSectionString = shareWithGradesAndSections[i];

                            const split = gradeAndSectionString.split('-');

                            const fetchSectionStudents = await UserModel.find({
                                schoolId,
                                role: 'student',
                                grade: split[0],
                                section: split[1],
                                deletedAt: undefined,
                            });

                            if (fetchSectionStudents) {
                                fetchSectionStudents.map((s: any) => {
                                    const student = s.toObject();
                                    studentActivities.push({
                                        userId: student._id,
                                        title,
                                        subtitle,
                                        status: 'unread',
                                        date: new Date(),
                                        announcementId: createAnnouncement._id,
                                        target: 'ANNOUNCEMENT',
                                    });
                                });
                            }
                        }
                    } else if (selectedUsers) {
                        // SELECTED USERS ONLY
                        const setOfIds = new Set(selectedUsers);

                        const userIds = Array.from(setOfIds);

                        const fetchSelectedStudents = await UserModel.find({
                            _id: { $in: userIds },
                            deletedAt: undefined,
                        });

                        if (fetchSelectedStudents) {
                            fetchSelectedStudents.map((s: any) => {
                                const student = s.toObject();
                                studentActivities.push({
                                    userId: student._id,
                                    title,
                                    subtitle,
                                    status: 'unread',
                                    date: new Date(),
                                    announcementId: createAnnouncement._id,
                                    target: 'ANNOUNCEMENT',
                                });
                            });
                        }
                    }

                    console.log('Student Activities', studentActivities.length);

                    if (studentActivities.length > 0) {
                        await ActivityModel.insertMany(studentActivities);
                    }
                }
            }

            let instructorActivities: any[] = [];

            if (shareWithAllInstructors) {
                const schoolInstructors = await UserModel.find({
                    schoolId,
                    role: 'instructor',
                    deletedAt: undefined,
                });

                if (!schoolInstructors) return;

                schoolInstructors.map((inst: any) => {
                    const instructor = inst.toObject();

                    instructorActivities.push({
                        userId: instructor._id,
                        title,
                        subtitle,
                        status: 'unread',
                        date: new Date(),
                        announcementId: createAnnouncement._id,
                        target: 'ANNOUNCEMENT',
                    });
                });

                console.log('Instructor Activities', instructorActivities.length);
            } else {
                // SELECTED INSTRUCTORS ONLY
                const setOfIds = new Set(selectedInstructors);

                const userIds = Array.from(setOfIds);

                const fetchSelectedInstructors = await UserModel.find({
                    _id: { $in: userIds },
                    deletedAt: undefined,
                });

                if (fetchSelectedInstructors) {
                    fetchSelectedInstructors.map((inst: any) => {
                        const instructor = inst.toObject();
                        instructorActivities.push({
                            userId: instructor._id,
                            title,
                            subtitle,
                            status: 'unread',
                            date: new Date(),
                            announcementId: createAnnouncement._id,
                            target: 'ANNOUNCEMENT',
                        });
                    });
                }
            }

            if (instructorActivities.length > 0) {
                await ActivityModel.insertMany(instructorActivities);
            }

            return true;
        } catch (e) {
            console.log('Error', e);
            return false;
        }
    }
}
