import path from 'path';
import fs from 'fs';
import os from 'os';
import axios from "axios";
import { parse as parseUrl, UrlWithStringQuery } from 'url';
import { parseString as parseXmlString } from 'xml2js';
import extractZip from 'extract-zip';
import HttpProxyAgent from 'http-proxy-agent';
import HttpsProxyAgent, {} from 'https-proxy-agent';

export class Downloader {

    private readonly ONE_DAY_MS = 8.64e+7;
    private readonly NEVER_EXPIRE_DOWNLOADS = -1;

    nodePlatformToMavenSuffix = (): string => {
        switch (os.platform()) {
            case "win32":
                return "windows-x64.zip";
            case 'linux':
                return 'linux-x64.tar.gz';
            case 'darwin':
                return 'macosx-x64.tar.gz';
            default:
                throw new Error(`Plataform ${os.platform()} is currently not supported`);
        }
    }

    private ensureWritableLibDir = (libDir: string) => {
        if(!libDir) {
            libDir = path.resolve(__dirname, '../jlib');
        } else if(!path.isAbsolute(libDir)) {
            libDir = path.resolve(libDir);
        }

        if(!fs.existsSync(libDir)) {
            fs.mkdirSync(libDir);
        } else {
            fs.accessSync(libDir, fs.constants.W_OK);
        }

        return libDir;
    }

    public ensureArtifacts = async (config: any): Promise<void> => {
        const libDir = this.ensureWritableLibDir(config.downloads && config.downloads.storageDirectory);
        const downloadExpirationTimeMs = config.downloads && config.downloads.expirationTimeInMs;

        throw new Error("Not implemented!");
    }



    private downloadMaven = async (
        libDir: string,
        groupId: string,
        artifactId: string,
        version: string,
        downloadExpirationTimeMs: number
    ) => {

        console.log('DOWNLOADING', url);
        const client = await axios.get("");
    }

    private resolveMavenVersion = async (
        libDir: string,
        groupId: string,
        artifactId: string,
        version: string,
        downloadExpirationTimeMs: number
    ) : Promise<string> => {
        if(version && version !== 'latest') {
            return version;
        } else {
            const latestCacheFile = path.join(libDir, `${groupId}_${artifactId}.latest`);
            const xmlReqeust = saveCachedUrlToPath(latestCacheFile, `https://repo1.maven.org/maven2/${groupId.replace(/\./g, '/')}/${artifactId}/maven-metadata.xml`, downloadExpirationTimeMs);
        }
    }
}

