"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureArtifacts = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const url_1 = require("url");
const xml2js_1 = require("xml2js");
const http_proxy_agent_1 = require("http-proxy-agent");
const https_proxy_agent_1 = require("https-proxy-agent");
const ONE_DAY_MS = 8.64e+7;
const NEVER_EXPIRE_DOWNLOADS = -1;
function createProxyAgent(protocol, env) {
    if (protocol === 'http:') {
        const proxy = env.npm_config_proxy ||
            env.npm_config_http_proxy ||
            env.HTTP_PROXY ||
            env.http_proxy ||
            env.npm_config_proxy;
        if (proxy) {
            return new http_proxy_agent_1.Agent(proxy);
        }
    }
    else if (protocol === 'https:') {
        const proxy = env.npm_config_https_proxy ||
            env.HTTPS_PROXY ||
            env.https_proxy ||
            env.npm_config_proxy;
        if (proxy) {
            return new https_proxy_agent_1.Agent(proxy);
        }
    }
}
function createRequest(options, agent) {
    return new Promise((resolve, reject) => {
        let client;
        if (options.protocol === 'http:') {
            client = require('http');
            if (!options.port) {
                options.port = 80;
            }
        }
        else if (options.protocol === 'https:') {
            client = require('https');
            if (!options.port) {
                options.port = 443;
            }
        }
        else {
            return reject(new Error('Unsupported download protocol'));
        }
        options.method = 'GET';
        options.agent = agent;
        const req = client.request(options, (res) => {
            resolve(res);
        });
        req.on('error', reject);
        req.end();
    });
}
function saveCachedUrlToPath(destinationPath, url, downloadExpirationTimeMs) {
    return __awaiter(this, void 0, void 0, function* () {
        const expirationTime = downloadExpirationTimeMs || ONE_DAY_MS;
        const stats = fs_1.default.existsSync(destinationPath) ? fs_1.default.statSync(destinationPath) : null;
        const useCachedVersion = stats && (expirationTime === NEVER_EXPIRE_DOWNLOADS || (Date.now() - stats.mtimeMs < expirationTime));
        if (useCachedVersion) {
            return destinationPath;
        }
        console.log('DOWNLOADING', url);
        const options = (0, url_1.parse)(url);
        const agent = createProxyAgent(options.protocol, process.env);
        const fileRes = yield createRequest(options, agent);
        if (fileRes.statusCode !== 200) {
            const err = new Error('Request failed for ' + url + ' - ' + fileRes.statusCode);
            err.statusCode = fileRes.statusCode;
            err.type = 'HTTP_ERROR';
            throw err;
        }
        const fileWriter = fs_1.default.createWriteStream(destinationPath);
        return new Promise((resolve, reject) => {
            fileRes.on('error', reject);
            fileRes.on('end', () => {
                fileWriter.end(() => {
                    resolve(destinationPath);
                });
            });
            fileRes.pipe(fileWriter);
        });
    });
}
function nodePlatformToMavenSuffix() {
    switch (os_1.default.platform()) {
        case "win32":
            return "windows-x64.zip";
        case 'linux':
            return 'linux-x64.tar.gz';
        case 'darwin':
            return 'macosx-x64.tar.gz';
        default:
            throw new Error(`Plataform ${os_1.default.platform()} is currently not supported`);
    }
}
function resolveMavenVersion(libDir, groupId, artifactId, version, downloadExpirationTimeMs) {
    return __awaiter(this, void 0, void 0, function* () {
        if (version && version !== 'latest') {
            return version;
        }
        else {
            const latestCacheFile = path_1.default.join(libDir, `${groupId}_${artifactId}.latest`);
            const manifestFilePath = yield saveCachedUrlToPath(latestCacheFile, `https://repo1.maven.org/maven2/${groupId.replace(/\./g, '/')}/${artifactId}/maven-metadata.xml`, downloadExpirationTimeMs);
            const manifestContent = fs_1.default.readFileSync(manifestFilePath, { encoding: 'utf8' });
            return new Promise((resolve, reject) => {
                (0, xml2js_1.parseString)(manifestContent, (err, result) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        const nonTestVersions = result.metadata.versioning[0].versions[0].version.filter((version) => version.match(/^[1-9]\.[0-9.]+$/));
                        if (!nonTestVersions.length) {
                            reject(new Error(`Stable version of ${groupId}_${artifactId} not found`));
                        }
                        else {
                            resolve(nonTestVersions[nonTestVersions.length - 1]);
                        }
                    }
                });
            });
        }
    });
}
function downloadMaven(libDir, groupId, artifactId, version, downloadExpirationTimeMs) {
    return __awaiter(this, void 0, void 0, function* () {
        const resolvedVersion = yield resolveMavenVersion(libDir, groupId, artifactId, version, downloadExpirationTimeMs);
        if (resolvedVersion.match(/^https/)) {
            const flywaySavePath = path_1.default.join(libDir, path_1.default.basename(resolvedVersion));
            const fileSavePath = yield saveCachedUrlToPath(flywaySavePath, resolvedVersion, downloadExpirationTimeMs);
            return { version: resolvedVersion, type: 'asset', file: fileSavePath };
        }
        else if (artifactId === 'flyway-commandline') {
            const platformSuffix = nodePlatformToMavenSuffix();
            const flywayUrl = `https://repo1.maven.org/maven2/${groupId.replace(/\./g, '/')}/${artifactId}/${resolvedVersion}/${artifactId}-${resolvedVersion}-${platformSuffix}`;
            const flywaySavePath = path_1.default.join(libDir, `${artifactId}-${resolvedVersion}-${platformSuffix}`);
            const fileSavePath = yield saveCachedUrlToPath(flywaySavePath, flywayUrl, downloadExpirationTimeMs);
            return { version: resolvedVersion, type: 'command', file: fileSavePath };
        }
        else {
            const depUrl = `https://repo1.maven.org/maven2/${groupId.replace(/\./g, '/')}/${artifactId}/${resolvedVersion}/${artifactId}-${resolvedVersion}.jar`;
            const depSavePath = path_1.default.join(libDir, `${artifactId}-${resolvedVersion}.jar`);
            const fileSavePath = yield saveCachedUrlToPath(depSavePath, depUrl, downloadExpirationTimeMs);
            return { version: resolvedVersion, type: 'asset', file: fileSavePath };
        }
    });
}
function ensureWritableLibDir(libDir) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!libDir) {
            libDir = path_1.default.resolve(__dirname, '../jlib');
        }
        else if (!path_1.default.isAbsolute(libDir)) {
            libDir = path_1.default.resolve(libDir);
        }
        if (!fs_1.default.existsSync(libDir)) {
            fs_1.default.mkdirSync(libDir);
        }
        else {
            fs_1.default.accessSync(libDir, fs_1.default.constants.W_OK);
        }
        return libDir;
    });
}
const ensureArtifacts = (config) => __awaiter(void 0, void 0, void 0, function* () {
    const libDir = yield ensureWritableLibDir(config.downloads && config.downloads.storageDirectory);
    const downloadExpirationTimeMs = config.downloads && config.downloads.expirationTimeInMs;
    let pendingDownloads = [downloadMaven(libDir, 'org.flywaydb', 'flyway-commandline', config.downloadUrl || config.version, downloadExpirationTimeMs)];
    if (config.mavenPlugins || config.mavinPlugins) {
        const plugins = config.mavinPlugins === undefined ? config.mavenPlugins : config.mavinPlugins;
        pendingDownloads = pendingDownloads.concat(plugins.map((plugin) => {
            return downloadMaven(libDir, plugin.groupId, plugin.artifactId, plugin.downloadUrl || plugin.version, downloadExpirationTimeMs);
        }));
    }
    const assets = yield Promise.all(pendingDownloads);
    const binFile = os_1.default.platform() === 'win32' ? 'flyway.cmd' : 'flyway';
    return path_1.default.join(assets[0].dir, `flyway-${assets[0].version}`, binFile);
});
exports.ensureArtifacts = ensureArtifacts;
//# sourceMappingURL=new-download.js.map