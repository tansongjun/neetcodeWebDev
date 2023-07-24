import { Storage } from "@google-cloud/storage";
import fs from 'fs';
import ffmpeg from "fluent-ffmpeg";

const storage = new Storage();//Creating an instance of GCS


const rawVideoBucketName = "-neetCode-yt-raw-videos";//Users will upload their videos here

//We then download from ^ and after processing, we upload here
const processedVideoBucketName = "-neetCode-yt-processed-videos";

//when we download, we will put them in these folders in our local file system
const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";

export function setupDirectories() {
  ensureDirectoryExistence(localRawVideoPath);
  ensureDirectoryExistence(localProcessedVideoPath);
}

export function convertVideo(rawVideoName: string, processedVideoName: string) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
      .outputOptions("-vf", "scale=-1:360") // 360p
      .on("end", function () {
        console.log("Processing finished successfully");
        resolve();
      })
      .on("error", function (err: any) {
        console.log("An error occurred: " + err.message);
        reject(err);
      })
      .save(`${localProcessedVideoPath}/${processedVideoName}`);
  });
}

export async function downloadRawVideo(fileName: string) {
  await storage.bucket(rawVideoBucketName)
    .file(fileName)
    .download({
      destination: `${localRawVideoPath}/${fileName}`,
    });

  console.log(
    `gs://${rawVideoBucketName}/${fileName} downloaded to ${localRawVideoPath}/${fileName}.`
  );
}

export async function uploadProcessedVideo(fileName: string) {
  const bucket = storage.bucket(processedVideoBucketName);

  await bucket.upload('${localProcessedVideoPath}/${fileName}', {
    destination: fileName //specifying the file name after it is stored
  })
  console.log(
    `${localProcessedVideoPath}/${fileName} uploaded to gs://${processedVideoBucketName}/${fileName}.`
  );

  await bucket.file(fileName).makePublic();//by default is private
}

function deleteFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if(fs.existsSync(filePath)){
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log('Failed to delete file at ${filePath}',err);
          reject(err);
        }
      })
    }else{
      console.log('File not found at ${filePath}, skipping the delete.');
      resolve();
    }
  })
}

export function deleteRawVideo(fileName: String) {
  return deleteFile('${localRawVideoPath}/${fileName}');;
}

export function deleteProcessedVideo(fileName: String) {
  return deleteFile('${localProcessedVideoPath}/${fileName}');;
}

function ensureDirectoryExistence(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true});
    console.log('Directory created at ${dirPath}');
  }
}