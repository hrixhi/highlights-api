import * as AWS from 'aws-sdk';
import Busboy from 'busboy';
import { GraphQLServer } from 'graphql-yoga';
import { basename } from 'path';

/**
 * This is the function used to initializeroutes that is going to let uses upload to the s3 bucket.
 * Either third party pdfs or images for the events
 */
export function initializeRoutes(GQLServer: GraphQLServer) {

    GQLServer.get("/api/test", (req: any, res: any) => {
        res.json({
            status: 'ok'
        })
    })
    /**
     * This is used for uploading images
     */
    GQLServer.post("/api/upload", (req: any, res: any) => {
        // this body field is used for recognizition if attachment is EventImage, Asset or simillar.
        console.log(req.file)
        const typeOfUpload = req.body.typeOfUpload;
        const busboy = new Busboy({ headers: req.headers });
        // The file upload has completed
        busboy.on("finish", () => {
            let file;
            try {
                // Grabs your file object from the request.
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

}