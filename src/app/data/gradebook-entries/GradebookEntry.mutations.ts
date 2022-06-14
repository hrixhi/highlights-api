import { Arg, Field, ObjectType } from 'type-graphql';
import { GradebookScoreModel } from '../gradebook-scores/mongo/GradebookScore.model';
import { NewGradebookEntryInput } from './input-types/NewGradebookEntryInput.type';
import { GradebookEntryModel } from './mongo/GradebookEntry.model';

@ObjectType()
export class GradebookEntryMutationResolver {
    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async create(
        @Arg('gradebookEntryInput', (type) => NewGradebookEntryInput) gradebookEntryInput: NewGradebookEntryInput
    ) {
        try {
            const { title, totalPoints, gradeWeight, deadline, channelId, scores } = gradebookEntryInput;

            // First create entry
            const createGradebook = await GradebookEntryModel.create({
                title,
                totalPoints,
                gradeWeight,
                deadline,
                channelId,
            });

            if (!createGradebook) {
                return false;
            }

            const entries = scores.map((score: any) => {
                let calculateScore = undefined;

                if (score.points) {
                    calculateScore = (score.points / totalPoints) * 100;

                    calculateScore = Math.round((calculateScore + Number.EPSILON) * 100) / 100;
                }

                return {
                    gradebookEntryId: createGradebook._id,
                    channelId,
                    userId: score.userId,
                    submitted: score.submitted,
                    points: score.points,
                    lateSubmission: score.lateSubmission,
                    submittedAt: score.submittedAt,
                    feedback: score.feedback,
                    score: calculateScore,
                };
            });

            const insertScores = await GradebookScoreModel.insertMany(entries);

            return true;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async edit(
        @Arg('gradebookEntryInput', (type) => NewGradebookEntryInput) gradebookEntryInput: NewGradebookEntryInput,
        @Arg('entryId', (type) => String) entryId: string
    ) {
        try {
            const { title, totalPoints, gradeWeight, deadline, channelId, scores } = gradebookEntryInput;

            // First update the entry
            const updateGradebookEntry = await GradebookEntryModel.updateOne(
                {
                    _id: entryId,
                },
                {
                    title,
                    totalPoints,
                    gradeWeight,
                    deadline,
                }
            );

            const getAllGradebookScores = await GradebookScoreModel.find({
                gradebookEntryId: entryId,
            });

            for (let i = 0; i < getAllGradebookScores.length; i++) {
                const gradebookScore = getAllGradebookScores[i];

                const findScore = scores.find((x: any) => x.userId === gradebookScore.userId);

                if (findScore) {
                    // Update existing score

                    let calculateScore = undefined;

                    if (findScore.points) {
                        calculateScore = (findScore.points / totalPoints) * 100;

                        calculateScore = Math.round((calculateScore + Number.EPSILON) * 100) / 100;
                    }

                    const updateGradebookScore = await GradebookScoreModel.updateOne(
                        {
                            _id: gradebookScore._id,
                        },
                        {
                            submitted: findScore.submitted,
                            points: findScore.points,
                            score: calculateScore,
                            lateSubmission: findScore.lateSubmission,
                            submittedAt: findScore.submittedAt,
                            feedback: findScore.feedback,
                        }
                    );
                } else {
                    // Remove the score from database
                    const deleteGradebookScore = await GradebookScoreModel.deleteOne({
                        _id: gradebookScore._id,
                    });
                }
            }

            let newScores: any[] = [];

            for (let i = 0; i < scores.length; i++) {
                const score = scores[i];

                let calculateScore = undefined;

                if (score.points) {
                    calculateScore = (score.points / totalPoints) * 100;

                    calculateScore = Math.round((calculateScore + Number.EPSILON) * 100) / 100;
                }

                const findExistingScore = getAllGradebookScores.find((x: any) => x.userId === score.userId);

                if (!findExistingScore) {
                    // Add new entry
                    newScores.push({
                        gradebookEntryId: entryId,
                        channelId,
                        userId: score.userId,
                        submitted: score.submitted,
                        points: score.points,
                        lateSubmission: score.lateSubmission,
                        submittedAt: score.submittedAt,
                        feedback: score.feedback,
                        score: calculateScore,
                    });
                }
            }

            if (newScores.length > 0) {
                const insertScores = await GradebookScoreModel.insertMany(newScores);
            }

            return true;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async delete(@Arg('entryId', (type) => String) entryId: string) {
        try {
            // Delete entry first
            const deleteEntry = await GradebookEntryModel.deleteOne({
                _id: entryId,
            });

            // Delete all the scores later
            const deleteScores = await GradebookScoreModel.deleteMany({
                gradebookEntryId: entryId,
            });

            return true;
        } catch (e) {
            return false;
        }
    }
}
