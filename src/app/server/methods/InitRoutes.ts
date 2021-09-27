import * as AWS from 'aws-sdk';
import Busboy from 'busboy';
import { GraphQLServer } from 'graphql-yoga';
import { link } from 'fs';
import { basename } from 'path';
import { UserModel } from '@app/data/user/mongo/User.model';
import { ChannelModel } from '@app/data/channel/mongo/Channel.model';
const mime = require('mime-types')
const util = require('util');

/**
 * This is the function used to initializeroutes that is going to let uses upload to the s3 bucket.
 * Either third party pdfs or images for the events
 */
export function initializeRoutes(GQLServer: GraphQLServer) {

    // Joined Zoom meeting
    GQLServer.post("/zoom_join", async (req: any, res: any) => {
        console.log(req.body)
        const accountId = req.body.payload.account_id
        const channelName = req.body.payload.object.topic

        const u = await UserModel.findOne({ "zoomInfo.accountId": accountId })
        const c = await ChannelModel.findOne({ name: channelName })

        if (u && c) {
            const user = u.toObject()
            const channel = c.toObject()

            if (channel.startedBy?.toString().trim() === user._id.toString().trim()) {
                await ChannelModel.updateOne({ _id: channel._id }, { meetingOn: true })
            }
        }

        res.json({
            status: 'ok'
        })
    })

    // Left Zoom
    GQLServer.post("/zoom_left", async (req: any, res: any) => {
        console.log(req.body)
        const accountId = req.body.payload.account_id
        const channelName = req.body.payload.object.topic

        const u = await UserModel.findOne({ "zoomInfo.accountId": accountId })
        const c = await ChannelModel.findOne({ name: channelName })

        if (u && c) {
            const user = u.toObject()
            const channel = c.toObject()

            if (channel.startedBy?.toString().trim() === user._id.toString().trim()) {
                await ChannelModel.updateOne({ _id: channel._id }, { meetingOn: false })
            }
        }

        res.json({
            status: 'ok'
        })
    })

    /**
     * This is used for uploading images
     */
    GQLServer.post("/api/upload", (req: any, res: any) => {
        // this body field is used for recognizition if attachment is EventImage, Asset or simillar.

        const typeOfUpload = req.body.typeOfUpload;
        const busboy = new Busboy({ headers: req.headers });
        // The file upload has completed
        busboy.on("finish", async () => {
            let file;
            try {
                // Grabs your file object from the request.`
                file = req.files.attachment;
            } catch (e) {
                //
            }
            AWS.config.update({
                accessKeyId: "AKIAJS2WW55SPDVYG2GQ",
                secretAccessKey: "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"
            });

            const s3 = new AWS.S3();
            // configuring parameters

            let params: any;
            try {
                params = {
                    Bucket: "cues-files",
                    Body: file.data,
                    Key:
                        "media/" +
                        typeOfUpload +
                        "/" +
                        Date.now() +
                        "_" +
                        basename(file.name)
                };

                s3.upload(params, (err: any, data: any) => {
                    // handle error
                    if (err) {
                        res.json({
                            status: "error",
                            url: null
                        });
                    }
                    // success
                    if (data) {
                        res.json({
                            status: "success",
                            url: data.Location
                        });
                    }
                });
            } catch (e) {
                //
            }
        });
        req.pipe(busboy);
    });

    GQLServer.post("/api/imageUploadEditor", (req: any, res: any) => {

        AWS.config.update({
            accessKeyId: "AKIAJS2WW55SPDVYG2GQ",
            secretAccessKey: "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"
        });

        const s3 = new AWS.S3();
        // configuring parameters

        const file = req.files.file;

        console.log("request", file);

        let params: any;
        try {
            params = {
                Bucket: "cues-files",
                Body: file.data,
                Key:
                    "media/" +
                    file.mimetype +
                    "/" +
                    Date.now() +
                    "_" +
                    basename(file.name)
            };

            s3.upload(params, (err: any, data: any) => {
                // handle error
                if (err) {
                    res.json({
                        // status: "error",
                        url: null
                    });
                }
                // success
                if (data) {
                    res.json({
                        // status: "success",
                        location: data.Location
                    });
                }
            });
        } catch (e) {
            //
        }

    });

    GQLServer.post("/api/multiupload", (req: any, res: any) => {
        console.log('in api')
        // this body field is used for recognizition if attachment is EventImage, Asset or simillar.
        const typeOfUpload = req.body.typeOfUpload;
        const busboy = new Busboy({ headers: req.headers });

        busboy.on("finish", async () => {
            let file: any = []
            let type: any = []
            try {
                // Grabs your file object from the request.`
                for (const property in req.files) {
                    file.push(req.files[property])
                    type.push(mime.extension(req.files[property].mimetype))

                }
            } catch (e) {
                console.log('in catch block')
            }
            AWS.config.update({
                accessKeyId: "AKIAJS2WW55SPDVYG2GQ",
                secretAccessKey: "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"
            });

            const s3 = new AWS.S3();
            // configuring parameters
            await uploadFiles(file, type, res);
        });
        req.pipe(busboy);
    });

}


const uploadFiles = async (file: any, type: any, res: any) => {
    let links: any = []
    return new Promise(async function (resolve, reject) {
        let count = 0;
        await file.forEach(async (fileItem: any, i: number) => {
            let params: any;
            params = {
                Bucket: "cues-files",
                Body: fileItem.data,
                Key:
                    "media/" +
                    type[i] +
                    "/" +
                    Date.now() +
                    "_" +
                    basename(fileItem.name)
            };
            var result1 = await afterLoop(params, res);
            if (result1) {
                count = count + 1
                links.push(result1)
                if (count == file.length) {
                    console.log('creating resp', links)
                    res.json({
                        status: "success",
                        url: links
                    });
                }
                resolve(result1)
            }
        });

    })
}
const afterLoop = async (params: any, res: any) => {
    return new Promise(function (resolve, reject) {
        AWS.config.update({
            accessKeyId: "AKIAJS2WW55SPDVYG2GQ",
            secretAccessKey: "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"
        });
        const s3 = new AWS.S3();
        s3.upload(params, async (err: any, data: any) => {
            // handle error
            if (err) {
                reject(err);
                res.json({
                    status: "error",
                    url: null
                });
            }
            // success
            if (data) {
                resolve(data.Location)
            }
        });
    })

}
