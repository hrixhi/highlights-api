// import * as AWS from 'aws-sdk';
// import Busboy from 'busboy';
// import { Request, Response } from 'express';
// import * as expresszip from 'express-zip';
// import { EventRepository } from '../../platform/event/mongo/Event.repository';
// import { GraphQLServer } from 'graphql-yoga';
// import { basename } from 'path';
// import * as s3zip from 's3-zip'

// const s3Zip: any = s3zip;
// const zip: any = expresszip;

// /**
//  * This is the function used to initializeroutes that is going to let uses upload to the s3 bucket.
//  * Either third party pdfs or images for the events
//  */
// export function initializeRoutes(GQLServer: GraphQLServer) {

//   /**
//    * This is used for uploading images
//    */
//   GQLServer.post("/api/upload", (req: any, res: any) => {
//     // this body field is used for recognizition if attachment is EventImage, Asset or simillar.
//     const typeOfUpload = req.body.typeOfUpload;
//     const busboy = new Busboy({ headers: req.headers });
//     // The file upload has completed
//     busboy.on("finish", () => {
//       let file;
//       try {
//         // Grabs your file object from the request.
//         file = req.files.attachment;
//       } catch (e) {
//         //
//       }
//       AWS.config.update({
//         accessKeyId: "AKIAIU2T4BRDUTYFKZRQ",
//         secretAccessKey: "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"
//       });

//       const s3 = new AWS.S3();
//       // configuring parameters

//       let params: any;
//       try {
//         params = {
//           Bucket: "istkt",
//           Body: file.data,
//           Key:
//             "media/" +
//             typeOfUpload +
//             "/" +
//             Date.now() +
//             "_" +
//             basename(file.name)
//         };

//         s3.upload(params, (err: any, data: any) => {
//           // handle error
//           if (err) {
//             res.json({
//               status: "error",
//               url: null
//             });
//           }
//           // success
//           if (data) {
//             res.json({
//               status: "success",
//               url: data.Location
//             });
//           }
//         });
//       } catch (e) {
//         //
//       }
//     });
//     req.pipe(busboy);
//   });

//   /**
//    * This is used for uploading tickets (pdfs)
//    */
//   GQLServer.post("/api/ticketsupload", (req: any, res: any) => {
//     // this body field is used for recognizition if attachment is EventImage, Asset or simillar.
//     const ticketsLoc = req.body.ticketsLoc;

//     const busboy = new Busboy({ headers: req.headers });
//     // The file upload has completed
//     busboy.on("finish", () => {
//       let file;
//       try {
//         // Grabs your file object from the request.
//         file = req.files.attachment;
//       } catch (e) {
//         //
//       }

//       AWS.config.update({
//         accessKeyId: "AKIAIU2T4BRDUTYFKZRQ",
//         secretAccessKey: "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"
//       });

//       const s3 = new AWS.S3();
//       // configuring parameters
//       let params: any;
//       try {
//         params = {
//           Bucket: "istkt",
//           Body: file.data,
//           Key:
//             "tickets/" +
//             ticketsLoc +
//             "/" +
//             Date.now() +
//             "_" +
//             basename(file.name).replace(/ /g, "_")
//         };
//         s3.upload(params, (err: any, data: any) => {
//           // handle error
//           if (err) {
//             res.json({
//               status: "error",
//               url: null
//             });
//           }
//           // success
//           if (data) {
//             res.json({
//               status: "success",
//               url: data.Location
//             });
//           }
//         });
//       } catch (e) {
//         //
//       }
//     });
//     req.pipe(busboy);
//   });

//   GQLServer.get('/api/downloadall/:eventId', async (req: Request, res: Response) => {
//     const eventId = req.params.eventId;
//     const eventRepository = new EventRepository();

//     const event: any = await eventRepository.findById(eventId);
//     const ticetsLoc = event.name.replace(/ /g, "_") + "-" + eventId + "/";

//     const pdfURLs: [] = event.ticketsURL;

//     let pdfFiles: any[] = [];
//     event.ticketsURL.map((url: string) => {
//       pdfFiles.push({
//         path: url,
//         name: url.split("/").slice(-1)[0]
//       })
//     })

//     AWS.config.update({
//       accessKeyId: "AKIAIU2T4BRDUTYFKZRQ",
//       secretAccessKey: "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"
//     });

//     const s3 = new AWS.S3();
//     const bucket = "istkt";

//     s3Zip.archive({ s3: s3, bucket: bucket, debug: true }, ticetsLoc).pipe(res);
//   })
// }
