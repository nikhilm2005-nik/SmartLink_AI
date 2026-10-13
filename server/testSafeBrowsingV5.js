
require('dotenv').config({
    path: require('path').resolve(__dirname, '../.env')
});

const axios = require('axios');
const protobuf = require('protobufjs');

const Duration = new protobuf.Type('Duration')
    .add(new protobuf.Field('seconds', 1, 'int64'))
    .add(new protobuf.Field('nanos', 2, 'int32'));

const ThreatUrl = new protobuf.Type('ThreatUrl')
    .add(new protobuf.Field('url', 1, 'string'))
    .add(new protobuf.Field('threatTypes', 2, 'int32', 'repeated'));

const UrlsSearchResponse = new protobuf.Type('UrlsSearchResponse')
    .add(new protobuf.Field('threats', 1, 'ThreatUrl', 'repeated'))
    .add(new protobuf.Field('cacheDuration', 2, 'Duration'));

UrlsSearchResponse.add(ThreatUrl);
UrlsSearchResponse.add(Duration);

async function checkUrl(url, expectedThreat) {
    const response = await axios.get(
        'https://safebrowsing.googleapis.com/v5/urls:search',
        {
            params: {
                key: process.env.SAFE_BROWSING_API_KEY,
                urls: url
            },
            responseType: 'arraybuffer',
            timeout: 10000
        }
    );

    const decoded = UrlsSearchResponse.decode(
        Buffer.from(response.data)
    );

    const result = UrlsSearchResponse.toObject(decoded, {
        longs: String,
        defaults: false
    });

    const detected = (result.threats || []).length > 0;

    console.log({
        url,
        expectedThreat,
        detected,
        passed: detected === expectedThreat,
        threats: result.threats || []
    });

    if (detected !== expectedThreat) {
        throw new Error(`Unexpected threat result for ${url}`);
    }
}

async function main() {
    if (!process.env.SAFE_BROWSING_API_KEY) {
        throw new Error('SAFE_BROWSING_API_KEY is missing from .env');
    }

    await checkUrl('https://www.google.com', false);

    await checkUrl(
        'https://testsafebrowsing.appspot.com/s/phishing.html',
        true
    );

    console.log('Both v5 tests passed.');
}

main().catch(error => {
    console.error(
        'V5 test failed:',
        error.response?.status,
        error.message
    );
    process.exitCode = 1;
});
