import * as AWS from 'aws-sdk';
import Busboy from 'busboy';
import { GraphQLServer } from 'graphql-yoga';
import { link } from 'node:fs';
import { basename } from 'path';
const mime = require('mime-types')
const util = require('util');

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
    GQLServer.post("/api/multiupload", (req: any, res: any) => {
        // this body field is used for recognizition if attachment is EventImage, Asset or simillar.
        const typeOfUpload = req.body.typeOfUpload;
        const busboy = new Busboy({ headers: req.headers });
        
        busboy.on("finish", async () => {
            let file: any = []
            let type:any = []
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

           

         await uploadFiles(file,type,res);
        });
        req.pipe(busboy);
    });

}


    const uploadFiles= async (file:any,type:any,res:any)=>{
        let links:any=[]
        return new Promise( async function  (resolve, reject){     
            let count=0;      
           await file.forEach(async(fileItem:any,i:number) => {
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
                var result1 = await afterLoop(params);
                if(result1){
                    count=count+1
                    links.push(result1)
                    if(count==file.length){
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
    const afterLoop=async(params:any)=>{
       
        return new Promise(function (resolve, reject){
            AWS.config.update({
                accessKeyId: "AKIAJS2WW55SPDVYG2GQ",
                secretAccessKey: "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"
            });
            const s3 = new AWS.S3();
             s3.upload(params, async (err: any, data: any) => {
                // handle error
                if (err) {
                    reject(err);
                    
                }
                // success
                if (data) {
                  
                        resolve(data.Location)
                    
                }
            });
        })
        
    }
