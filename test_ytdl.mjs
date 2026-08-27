import ytdl from '@distube/ytdl-core';
try {
  const info = await ytdl.getInfo('https://youtu.be/BmhSOfj-7aE?si=LE2kkjDASn_ICoD');
  console.log(info.videoDetails.title);
} catch (e) {
  console.error('ERROR:', e.message);
  console.error(e.stack);
}
