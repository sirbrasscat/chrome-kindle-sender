/**
 * Email Service Validation & Parameter Verification Tests
 */

const EmailService = require('./lib/email-service.js');

function testEmailService() {
  console.log('--- Testing EmailService Validation Logic ---');

  // Test 1: Empty settings should throw
  let passed = false;
  try {
    EmailService.validateSettings({});
  } catch (e) {
    passed = true;
    console.log('✓ Correctly caught missing kindleEmail error:', e.message);
  }
  if (!passed) throw new Error('Failed to validate empty settings');

  // Test 2: Missing API key for Resend
  passed = false;
  try {
    EmailService.validateSettings({
      kindleEmail: 'test@kindle.com',
      senderEmail: 'sender@example.com',
      provider: 'resend',
      apiKey: ''
    });
  } catch (e) {
    passed = true;
    console.log('✓ Correctly caught missing API key error:', e.message);
  }
  if (!passed) throw new Error('Failed to validate missing API key');

  // Test 3: Valid Resend configuration
  EmailService.validateSettings({
    kindleEmail: 'test@kindle.com',
    senderEmail: 'sender@example.com',
    provider: 'resend',
    apiKey: 're_test_key_123'
  });
  console.log('✓ Correctly validated valid Resend configuration');

  // Test 4: Valid Webhook configuration
  EmailService.validateSettings({
    kindleEmail: 'test@kindle.com',
    provider: 'webhook',
    webhookUrl: 'http://localhost:3080/send-kindle'
  });
  console.log('✓ Correctly validated valid Webhook configuration');

  console.log('--- ALL EMAIL SERVICE TESTS PASSED ---');
}

testEmailService();
