import { Arg, Field, ObjectType } from 'type-graphql';
import { AnnouncementModel } from './mongo/announcement.model';
import { AnnouncementInput } from './input-types/AnnouncementInput.type';
import { ActivityModel } from '../activity/mongo/activity.model';
import { UserModel } from '../user/mongo/User.model';
import { convert } from 'html-to-text';
import { EditAnnouncementInputAdmin } from './input-types/EditAnnouncementInputAdmin.type';

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

    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async editAnnouncement(
        @Arg('announcementInput', (type) => EditAnnouncementInputAdmin) announcementInput: EditAnnouncementInputAdmin
    ) {
        try {
            const {
                id,
                title,
                description,
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

            const fetchExistingAnnouncement = await AnnouncementModel.findById(id);

            if (!fetchExistingAnnouncement) {
                return false;
            }

            const subtitle = convert(description);

            const studentsToShareWith: string[] = [];

            const studentActivities: any[] = [];

            // Shared with students and parents so need to modify Alerts
            if (selectedSegment && fetchExistingAnnouncement.selectedSegment) {
                const existingUserIds = fetchExistingAnnouncement.selectedUsers
                    ? fetchExistingAnnouncement.selectedUsers
                    : [];

                const fetchExistingStudentsSharedWith: any[] = await UserModel.find({
                    $and: [{ _id: { $in: existingUserIds } }, { role: 'student' }],
                });

                const existingStudentIds: string[] = fetchExistingStudentsSharedWith.map((student) =>
                    student._id.toString()
                );

                if (allGradesAndSections && allUsersSelected) {
                    // ALL SCHOOL STUDENTS
                    const fetchAllStudents = await UserModel.find({
                        schoolId: fetchExistingAnnouncement.schoolId,
                        role: 'student',
                        deletedAt: undefined,
                    });

                    if (fetchAllStudents) {
                        fetchAllStudents.map((s: any) => {
                            const student = s.toObject();
                            studentActivities.push({
                                userId: student._id.toString(),
                                title,
                                subtitle,
                                status: 'unread',
                                date: new Date(),
                                announcementId: id,
                                target: 'ANNOUNCEMENT',
                            });

                            studentsToShareWith.push(student._id.toString());
                        });
                    }
                } else if (!allGradesAndSections && allUsersSelected && shareWithGradesAndSections) {
                    // ALL STUDENTS FOR SELECTED SECTIONS

                    for (let i = 0; i < shareWithGradesAndSections.length; i++) {
                        const gradeAndSectionString = shareWithGradesAndSections[i];

                        const split = gradeAndSectionString.split('-');

                        const fetchSectionStudents = await UserModel.find({
                            schoolId: fetchExistingAnnouncement.schoolId,
                            role: 'student',
                            grade: split[0],
                            section: split[1],
                            deletedAt: undefined,
                        });

                        if (fetchSectionStudents) {
                            fetchSectionStudents.map((s: any) => {
                                const student = s.toObject();
                                studentActivities.push({
                                    userId: student._id.toString(),
                                    title,
                                    subtitle,
                                    status: 'unread',
                                    date: new Date(),
                                    announcementId: id,
                                    target: 'ANNOUNCEMENT',
                                });

                                studentsToShareWith.push(student._id.toString());
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
                                userId: student._id.toString(),
                                title,
                                subtitle,
                                status: 'unread',
                                date: new Date(),
                                announcementId: id,
                                target: 'ANNOUNCEMENT',
                            });
                            studentsToShareWith.push(student._id.toString());
                        });
                    }
                }

                //
                const addedStudents: string[] = [];
                const removedStudents: string[] = [];

                existingStudentIds.map((userId: any) => {
                    if (!studentsToShareWith.includes(userId)) {
                        removedStudents.push(userId);
                    }
                });

                studentsToShareWith.map((userId: any) => {
                    if (!existingStudentIds.includes(userId)) {
                        addedStudents.push(userId);
                    }
                });

                console.log('Students To Share With', studentsToShareWith);

                // Create Activities only for added Students
                const finalCreateActivities = studentActivities.filter((activity: any) =>
                    addedStudents.includes(activity.userId)
                );

                console.log('Final Activities to create', finalCreateActivities);

                // Create Activities for students
                if (finalCreateActivities.length > 0) {
                    const createStudentActivities = await ActivityModel.insertMany(finalCreateActivities);
                    // Send notifications also
                }

                if (removedStudents.length > 0) {
                    // Delete Activities for removed students
                    const deleteStudentActivities = await ActivityModel.deleteMany({
                        userId: { $in: removedStudents },
                    });
                    console.log('removedStudents', removedStudents);
                }
            }

            let instructorActivities: any[] = [];

            const instructorsToShareWith: string[] = [];

            const existingInstructorIds = fetchExistingAnnouncement.selectedInstructors
                ? fetchExistingAnnouncement.selectedInstructors
                : [];

            const fetchExistingInstructorsSharedWith: any[] = await UserModel.find({
                $and: [{ _id: { $in: existingInstructorIds } }, { role: 'instructor' }],
            });

            const existingIds: string[] = fetchExistingInstructorsSharedWith.map((instructor) =>
                instructor._id.toString()
            );

            console.log('Existing Ids', existingIds);

            if (shareWithAllInstructors) {
                const schoolInstructors = await UserModel.find({
                    schoolId: fetchExistingAnnouncement.schoolId,
                    role: 'instructor',
                    deletedAt: undefined,
                });

                if (!schoolInstructors) return;

                schoolInstructors.map((inst: any) => {
                    const instructor = inst.toObject();

                    instructorActivities.push({
                        userId: instructor._id.toString(),
                        title,
                        subtitle,
                        status: 'unread',
                        date: new Date(),
                        announcementId: id,
                        target: 'ANNOUNCEMENT',
                    });

                    instructorsToShareWith.push(instructor._id.toString());
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
                            userId: instructor._id.toString(),
                            title,
                            subtitle,
                            status: 'unread',
                            date: new Date(),
                            announcementId: id,
                            target: 'ANNOUNCEMENT',
                        });

                        instructorsToShareWith.push(instructor._id.toString());
                    });
                }
            }

            console.log('INstructors to share with', instructorsToShareWith);

            //
            const addedInstructors: string[] = [];
            const removedInstructors: string[] = [];

            existingIds.map((userId: any) => {
                if (!instructorsToShareWith.includes(userId)) {
                    removedInstructors.push(userId);
                }
            });

            instructorsToShareWith.map((userId: any) => {
                if (!existingIds.includes(userId)) {
                    addedInstructors.push(userId);
                }
            });

            // Create Activities only for added Students
            const finalCreateActivitiesInstructors = instructorActivities.filter((activity: any) =>
                addedInstructors.includes(activity.userId)
            );

            console.log('Final Create Activities Instructors', finalCreateActivitiesInstructors);

            // Create Activities for students
            if (finalCreateActivitiesInstructors.length > 0) {
                const createStudentActivities = await ActivityModel.insertMany(finalCreateActivitiesInstructors);
                // Send notifications also
            }

            if (removedInstructors.length > 0) {
                // Delete Activities for removed students
                const deleteStudentActivities = await ActivityModel.deleteMany({
                    userId: { $in: removedInstructors },
                });
                console.log('removedInstructors', removedInstructors);
            }

            const updateAnnouncement = await AnnouncementModel.updateOne(
                {
                    _id: id,
                },
                {
                    title,
                    description,
                    selectedSegment,
                    allGradesAndSections,
                    allUsersSelected,
                    shareWithGradesAndSections,
                    selectedUsers,
                    shareWithAllInstructors,
                    selectedInstructors,
                    shareWithAllAdmins,
                    selectedAdmins,
                }
            );

            return updateAnnouncement.nModified > 0;
        } catch (e) {
            console.log('Error', e);
            return false;
        }
    }
}
