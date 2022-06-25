import { Arg, Field, ObjectType } from 'type-graphql';
import { StandardsScoresModel } from '../standards-scores/mongo/standards-scores.model';
import { NewStandardsInput } from './input-types/Standards.input';
import { StandardsModel } from './mongo/Standards.model';

/**
 * Standards Mutation Endpoints
 */
@ObjectType()
export class StandardsMutationResolver {
    // Create new Standard with/without scores
    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async create(@Arg('standardsInput', (type) => NewStandardsInput) standardsInput: NewStandardsInput) {
        try {
            const { standards, standardsScores, channelId } = standardsInput;

            for (let i = 0; i < standards.length; i++) {
                const standard = standards[i];

                // Create Standard
                const createStandard = await StandardsModel.create({
                    ...standard,
                    channelId,
                });

                // Add scores for the standard
                if (createStandard && standardsScores) {
                    const scoresForStandard = standardsScores[i];

                    for (let j = 0; j < scoresForStandard.length; j++) {
                        const score = scoresForStandard[j];

                        const { points, userId } = score;

                        await StandardsScoresModel.create({
                            points,
                            userId,
                            standardId: createStandard._id,
                        });
                    }
                }
            }

            return true;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async updateStandardScore(
        @Arg('standardId', (type) => String) standardId: string,
        @Arg('userId', (type) => String) userId: string,
        @Arg('points', (type) => Number) points: number,
        @Arg('override', (type) => Boolean) override: boolean
    ) {
        try {
            if (override) {
                // First check if there is a score that is overridden
                const checkOverride = await StandardsScoresModel.findOne({
                    userId,
                    standardId,
                    overridden: true,
                });

                // If it exists then update the current one otherwise create a new overridden score
                if (checkOverride) {
                    const updateOverride = await StandardsScoresModel.updateOne(
                        {
                            _id: checkOverride._id,
                        },
                        {
                            points,
                        }
                    );
                } else {
                    const newOverride = await StandardsScoresModel.create({
                        userId,
                        standardId,
                        points,
                        overridden: true,
                    });
                }
            } else {
                const newEntry = await StandardsScoresModel.create({
                    userId,
                    standardId,
                    points,
                });
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
    public async revertOverriddenStandardScore(
        @Arg('standardId', (type) => String) standardId: string,
        @Arg('userId', (type) => String) userId: string
    ) {
        try {
            const deleteOverride = await StandardsScoresModel.deleteOne({
                standardId,
                userId,
                overridden: true,
            });

            return true;
        } catch (e) {
            console.log('Error', e);
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used to handle editing standards',
    })
    public async editStandard(
        @Arg('standardId', (type) => String) standardId: string,
        @Arg('title', (type) => String) title: string,
        @Arg('description', (type) => String, { nullable: true }) description?: string,
        @Arg('category', (type) => String, { nullable: true }) category?: string
    ) {
        try {
            const updateStandard = await StandardsModel.updateOne(
                {
                    _id: standardId,
                },
                {
                    title,
                    description,
                    category,
                }
            );

            return updateStandard.nModified > 0;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used to handle editing standards',
    })
    public async deleteStandard(@Arg('standardId', (type) => String) standardId: string) {
        try {
            const deleteStandard = await StandardsModel.deleteOne({
                _id: standardId,
            });

            const deleteScores = await StandardsScoresModel.deleteMany({
                standardId,
            });

            return true;
        } catch (e) {
            return false;
        }
    }
}
