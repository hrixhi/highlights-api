import { Arg, Field, ObjectType } from 'type-graphql';
import { CueObject } from './types/Cue.type';
import { CueModel } from './mongo/Cue.model';
import { StatusModel } from '../status/mongo/Status.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { SharedWithObject } from './types/SharedWith';
import { ChannelModel } from '../channel/mongo/Channel.model';
import Axios from 'axios';
import request from 'request-promise';
import * as AWS from 'aws-sdk';
import { basename } from 'path';

/**
 * Cue Query Endpoints
 */
@ObjectType()
export class CueQueryResolver {
    @Field((type) => [CueObject], {
        description: 'Returns list of cues by channel.',
    })
    public async findByChannelId(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        const result: any = await CueModel.find({
            channelId,
        });
        return result;
    }

    @Field((type) => [CueObject], {
        description: 'Returns list of unread cues by channel.',
    })
    public async findUnreadByChannelId(
        @Arg('channelId', (type) => String)
        channelId: string,
        @Arg('userId', (type) => String)
        userId: string
    ) {
        const unreadCueIds = await StatusModel.find({ status: { $ne: 'read' }, channelId, userId });
        const ids: any[] = [];
        unreadCueIds.map((item) => {
            ids.push(item.cueId);
        });
        const result: any = await CueModel.find({ _id: { $in: ids } });
        return result;
    }

    @Field((type) => [CueObject], {
        description: 'Returns list of cues created by a user.',
    })
    public async findByUserId(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            return await ModificationsModel.find({ userId });
        } catch (e) {
            return [];
        }
    }

    @Field((type) => [CueObject], {
        description: 'Returns list of cues created by a user.',
    })
    public async getCuesFromCloud(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            const localCues: any[] = await CueModel.find({
                createdBy: userId,
                channelId: null,
            });
            const channelCues: any[] = await ModificationsModel.find({
                userId,
                restrictAccess: { $ne: true },
            });

            const filterInitiateAt = channelCues.filter((cue: any) => cue.initiateAt !== null);
            const allCues: any[] = [...localCues, ...channelCues];
            return allCues;
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => [SharedWithObject], {
        description: 'Returns list of people who have received the cue.',
    })
    public async getSharedWith(
        @Arg('channelId', (type) => String)
        channelId: string,
        @Arg('cueId', (type) => String, { nullable: true })
        cueId?: string
    ) {
        try {
            const fetchChannel = await ChannelModel.findById(channelId);

            let owners: any[] = [];

            if (fetchChannel) {
                owners = fetchChannel.owners
                    ? [...fetchChannel.owners, fetchChannel.createdBy.toString()]
                    : [fetchChannel.createdBy.toString()];
            }

            const subscribers = await SubscriptionModel.find({
                channelId,
                unsubscribedAt: { $exists: false },
            });
            const modifications = cueId ? await ModificationsModel.find({ cueId, restrictAccess: { $ne: true } }) : [];

            const sharedWith: any[] = [];

            console.log('Owners', owners);

            subscribers.map((s) => {
                const sub = s.toObject();
                const mod = modifications.find((m) => m.userId.toString().trim() === sub.userId.toString().trim());

                if (!owners.includes(sub.userId.toString())) {
                    sharedWith.push({
                        value: sub.userId,
                        sharedWith: mod ? true : false,
                    });
                }
            });

            console.log('Shared with', sharedWith);
            return sharedWith;
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => Boolean, {
        description: 'Returns true if and only if the releaseSubmission property is true for ',
    })
    public async getReleaseSubmissionStatus(
        @Arg('cueId', (type) => String)
        cueId: string
    ) {
        try {
            const c = await CueModel.findById(cueId);

            if (c && c.releaseSubmission) {
                return true;
            }

            return false;
        } catch (e) {
            return [];
        }
    }

    @Field((type) => String)
    public async retrievePDFFromArchive(
        @Arg('identifier', (type) => String)
        identifier: string
    ) {
        try {
            const response = await Axios.get('https://archive.org/download/' + identifier);
            const html = response.data;

            // console.log("HTML", html);

            // console.log(response)
            return html;
        } catch (e) {
            console.log(e);
            return 'error';
        }
    }

    @Field((type) => String)
    public async uploadPDFToS3(
        @Arg('url', (type) => String)
        url: string,
        @Arg('title', (type) => String)
        title: string
    ) {
        try {
            AWS.config.update({
                accessKeyId: 'AKIAJS2WW55SPDVYG2GQ',
                secretAccessKey: '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',
            });

            const options = {
                uri: url,
                encoding: null,
            };

            const body = await request(options);

            const s3 = new AWS.S3();

            const toReturn = await s3.upload(
                {
                    Bucket: 'cues-files',
                    Key: 'media/' + 'books/' + Date.now() + '_' + basename(title),
                    Body: body,
                },
                (err: any, data: any) => {
                    // handle error
                    if (err) {
                        console.log(err);
                        return '';
                    }
                    console.log('Data', data);
                    // success
                    return data.Location;
                }
            );

            return toReturn;
        } catch (e) {
            console.log(e);
            return '';
        }
    }

    @Field((type) => String)
    public async getSubmissionAnnotations(
        @Arg('cueId', (type) => String)
        cueId: string,
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            const currCue = await ModificationsModel.findOne({
                cueId,
                userId,
            });

            if (!currCue || !currCue.cue) return '';

            const obj = JSON.parse(currCue.cue);

            const currAttempt = obj.attempts[obj.attempts.length - 1];

            console.log('Current annotations', currAttempt.annotations);

            return currAttempt.annotations && currAttempt.annotations !== '' ? currAttempt.annotations : '';
        } catch (e) {
            console.log(e);
            return '';
        }
    }
}
