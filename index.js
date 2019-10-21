const {
  WebClient
} = require('@slack/web-api');


const Slack = require('slack-node');
const dotenv = require('dotenv');
dotenv.config();

const token = process.env.SLACK_TOKEN;
let client = new WebClient(token);
const insightHelper = require('./helpers/insightHelper');
const setupHelper = require('./helpers/setupHelper');


exports.handler = async (event) => {
  console.log('In the function');
  console.log(event);

  if (event.challenge) {
    return event.challenge;
  } else if (event.cron) {
    console.log('not supported');
    return "200 OK";
  } else if (event.insight) {
    await insightHelper.handleInsightEvent(client, event);
    return "200 OK";
  } else if (event.type === "block_actions") {
    await handleInteraction(event);
    return "200 OK";
  } else if (event.type === "view_submission") {
    await handleModalSubmission(event);
  } else {
    await handleSlackEvent(event);
    return "200 OK";
  }
};

async function handleSlackEvent(event) {
  let slackEvent = event.event;
  console.log(JSON.stringify(slackEvent));

  if (slackEvent.subtype === "bot_message") {
    return "200 OK";
  }

  if (slackEvent.subtype === "channel_join") {
    await setupHelper.newChannelJoin(client, slackEvent.channel);
  } else if (slackEvent.type === "app_mention") {
    await handleMention(slackEvent);
  } else if (slackEvent.channel_type === "im") {
    await handleDm(slackEvent);
  }
}

async function handleMention(slackEvent) {
  let text = slackEvent.text.toLowerCase().trim();

  if (text.includes('setup') && text.includes('channel')) {
    await setupHelper.handler(client, slackEvent, "CHANNEL_SETUP");
  } else if (text.includes('setup') && text.includes('repo')) {
    await setupHelper.handler(client, slackEvent, "REPO_SETUP");
  } else if (text.includes('setup')) {
    await setupHelper.handler(client, slackEvent, "GENERAL_SETUP");
  } else if (text.includes('insight')) {
    let rg_id = text.slice(12).match(/\d/g);
    await insightHelper.postInsights(client, slackEvent.channel, slackEvent.event_ts, rg_id);
  }
}

async function handleDm(slackEvent) {
  let text = slackEvent.text.toLowerCase().trim();

  if (text.includes('setup')) {
    await setupHelper.handler(client, slackEvent);
  } else if (text.includes('insight')) {
    let rg_id = text.match(/\d/g);
    await postInsights(slackEvent.channel, slackEvent.event_ts, rg_id);
  }
}

async function handleInteraction(slackEvent) {
  const actionId = slackEvent.actions[0].action_id;
  console.log('HANDLING INTERACTION');
  console.log(JSON.stringify(slackEvent));

  switch (actionId) {
    case "CHANNEL_SELECTION":
      await setupHelper.postingChannelSelected(client, slackEvent);

      await client.chat.delete({
        channel: slackEvent.channel.id,
        ts: slackEvent.container.message_ts
      });
      break;
    case "CHANNEL_SETUP":
      console.log(JSON.stringify(slackEvent));
      await setupHelper.setPostingChannel(client, {"channel": slackEvent.channel.id});
      await client.chat.delete({
        channel: slackEvent.channel.id,
        ts: slackEvent.container.message_ts
      });
      break;
    case "REPO_SETUP":
      await setupHelper.setInterestedRepos(client, slackEvent);
      await client.chat.delete({
        channel: slackEvent.channel.id,
        ts: slackEvent.container.message_ts
      });
      break;
    case "RG_SETUP":
      await setupHelper.setInterestedRepoGroups(client, slackEvent);
      await client.chat.delete({
        channel: slackEvent.channel.id,
        ts: slackEvent.container.message_ts
      });
      break;
    default:
      break;
  }
}

async function handleModalSubmission(slackEvent) {
  console.log('Handling Modal!');
  let callbackId = slackEvent.view.callback_id;
  switch (callbackId) {
    case "REPO_SUBMISSION":
      let repoSubmission = slackEvent.view.state.values.repoInput.REPO_INPUT.value;
      console.log(repoSubmission);
      return "200 OK";
    case "RG_SUBMISSION":
      let rgSubmission = slackEvent.view.state.values.rgInput.RG_INPUT.value;
      console.log(rgSubmission);
      return "200 OK"
    default:
      return "200 OK";
  }
}
