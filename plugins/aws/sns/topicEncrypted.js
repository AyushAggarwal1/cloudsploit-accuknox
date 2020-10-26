var async = require('async');
var helpers = require('../../../helpers/aws');

module.exports = {
    title: 'SNS Topic Encrypted',
    category: 'SNS',
    description: 'Ensures that Amazon SNS topics enforce Server-Side Encryption (SSE)',
    more_info: 'SNS topics should enforce Server-Side Encryption (SSE) to secure data at rest. SSE protects the contents of messages in Amazon SNS topics using keys managed in AWS Key Management Service (AWS KMS).',
    recommended_action: 'Enable Server-Side Encryption to protect the content of SNS topic messages.',
    link: 'https://docs.aws.amazon.com/sns/latest/dg/sns-server-side-encryption.html',
    apis: ['SNS:listTopics', 'SNS:getTopicAttributes'],

    run: function(cache, settings, callback) {
        var results = [];
        var source = {};
        var regions = helpers.regions(settings);

        async.each(regions.sns, function(region, rcb){
            var listTopics = helpers.addSource(cache, source,
                ['sns', 'listTopics', region]);

            if (!listTopics) return rcb();

            if (listTopics.err || !listTopics.data) {
                helpers.addResult(results, 3,
                    'Unable to query for SNS topics: ' + helpers.addError(listTopics), region);
                return rcb();
            }

            if (!listTopics.data.length) {
                helpers.addResult(results, 0, 'No SNS topics found', region);
                return rcb();
            }

            async.each(listTopics.data, function(topic, cb){
                if (!topic.TopicArn) return cb();
                
                var resource = topic.TopicArn;

                var getTopicAttributes = helpers.addSource(cache, source,
                    ['sns', 'getTopicAttributes', region, resource]);

                if (!getTopicAttributes || getTopicAttributes.err || !getTopicAttributes.data) {
                    helpers.addResult(results, 3,
                        'Unable to query SNS topic attributes: ' + helpers.addError(getTopicAttributes),
                        region, resource);

                    return cb();
                }

                if (getTopicAttributes.data.Attributes &&
                    getTopicAttributes.data.Attributes.KmsMasterKeyId) {
                    helpers.addResult(results, 0,
                        'Server-Side Encryption is enabled for SNS topic',
                        region, resource);
                } 
                else {
                    helpers.addResult(results, 2,
                        'Server-Side Encryption is not enabled for SNS topic',
                        region, resource);
                }

                cb();

            }, function(){
                rcb();
            });
        }, function(){
            callback(null, results, source);
        });
    }
};