import test from 'node:test';
import assert from 'node:assert/strict';
import { dayReminderPush, restTimerPush, testPush } from './push-messages.js';

test('localizes every server-generated notification in Russian', () => {
  assert.deepEqual(restTimerPush('ru'), {
    title: 'Отдых закончился 💪',
    body: 'Пора на следующий подход.',
    tag: 'rest-timer',
  });
  assert.deepEqual(testPush('ru'), {
    title: 'openGym',
    body: 'Тестовое уведомление ✅ — так выглядят оповещения.',
    tag: 'test',
  });
  assert.deepEqual(dayReminderPush('ru', { name: 'Тренировка A', emoji: '💪' }), {
    title: '💪 Тренировка A сегодня',
    body: 'Она в плане — поехали 💪',
    tag: 'day-reminder',
  });
});

test('keeps the existing English copy as the fallback', () => {
  assert.deepEqual(restTimerPush('fr'), restTimerPush('en'));
  assert.equal(dayReminderPush('unknown', null).title, 'Workout planned today');
  assert.equal(testPush(undefined).body, 'Test notification ✅ — this is what alerts look like.');
});
