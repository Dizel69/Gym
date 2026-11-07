// Kettlebell movements the catalogue still does not have. A movement that arrived
// with the larger catalogue is not repeated here: KETTLEBELL_REPLACED points the
// old id at that exercise, so a saved plan and a logged set keep their history.
// Pictures are not redrawn. `mediaId` points at a clip the app already downloads.
// The punch has no clip of its own and keeps a small original drawing.

import { EXDB } from './exercises-data.js'

const still = name => `/kettlebell/${name}.jpg`
const pic = still
const mediaById = Object.fromEntries(EXDB.map(exercise => [exercise.id, exercise]))

function move(id, mediaId, n, bp, primaries, secondaries, st) {
  const src = mediaById[mediaId]
  return {
    id, n, bp, eq: 'kettlebell',
    tg: primaries[0], mg: secondaries[0] || primaries[0],
    sm: secondaries, primaries, secondaries,
    img: src.img, gif: src.gif, st, cat: 'strength',
  }
}

// Old ids from before the larger catalogue. The value is the exercise that shows
// the same movement, with its own picture.
export const KETTLEBELL_REPLACED = {
  'kb-halo': '2939',          // вращение гири вокруг головы
  'kb-around': '4534',        // рогатки: круг вокруг пояса
  'kb-full-swing': '3571',    // полный мах
  'kb-upright': '4408',       // тяга к подбородку
  'kb-deadlift': '3322',      // становая тяга
  'kb-side-bend': '4396',     // наклон в сторону
  'kb-plyo-squat': '3187',    // прыжок из кубкового приседа
  'kb-curl': '5857',          // сгибание на бицепс
  'kb-clean-press': '4531',   // взятие на грудь и жим одной рукой
  'kb-swing-one': '1568',     // мах одной рукой
  'kb-oh-ext': '5860',        // разгибание из-за головы
  'kb-burst': '0542',         // рывок одной рукой
  'kb-press': '3572',         // строгий жим
  'kb-protyazhka': '0548',    // протяжка сумо
}

export function replaceRetiredKettlebellIds(state) {
  if (!state) return false
  let changed = false
  const row = item => {
    const to = item && KETTLEBELL_REPLACED[item.id]
    if (!to) return
    item.id = to
    changed = true
  }
  for (const routine of state.routines || []) for (const ex of routine.ex || []) row(ex)
  for (const workout of state.workouts || []) for (const entry of workout.entries || []) row(entry)
  for (const entry of state.active?.entries || []) row(entry)
  for (const bag of ['exWeights', 'exNotes', 'barWeights']) {
    const obj = state[bag]
    if (!obj) continue
    for (const [from, to] of Object.entries(KETTLEBELL_REPLACED)) {
      if (!Object.prototype.hasOwnProperty.call(obj, from)) continue
      if (!Object.prototype.hasOwnProperty.call(obj, to)) obj[to] = obj[from]
      delete obj[from]
      changed = true
    }
  }
  if (Array.isArray(state.favEx) && state.favEx.some(id => KETTLEBELL_REPLACED[id])) {
    const seen = new Set()
    state.favEx = state.favEx.map(id => KETTLEBELL_REPLACED[id] || id).filter(id => seen.has(id) ? false : seen.add(id))
    changed = true
  }
  return changed
}

export const KETTLEBELL_EXTRA = [
  {
    id: 'kb-punch',
    n: 'kettlebell punch',
    bp: 'shoulders',
    eq: 'kettlebell',
    tg: 'delts',
    mg: 'pectorals',
    sm: ['triceps', 'abs'],
    primaries: ['front-deltoid', 'chest', 'triceps'],
    secondaries: ['obliques', 'serratus', 'forearm'],
    img: pic('kb-punch'),
    gif: pic('kb-punch'),
    cat: 'strength',
    st: [
      'Поставьте гирю на пол между стоп, возьмите её одной рукой и поднимите к плечу. Гиря лежит на предплечье у ключицы, локоть прижат к корпусу. Свободная рука у подбородка.',
      'Вверх не жмите. Выпрямите руку вперёд на уровне плеча и толкните гирю от себя. Корпус немного уходит за рукой.',
      'По той же дуге верните гирю к плечу.',
      'Опустите гирю на пол, возьмите её другой рукой и повторите удар.',
    ],
  },
  move('kb-pass', '0532', 'kettlebell hand-to-hand pass', 'lower arms',
    ['forearm'], ['side-deltoid', 'obliques'], [
      'Встаньте прямо. Держите гирю одной рукой перед собой.',
      'Передайте её в другую руку у пояса, не роняя и не замахиваясь.',
      'Сразу передайте обратно. Кисти работают всё время.',
    ]),
  move('kb-regrip', '0532', 'kettlebell regrip', 'lower arms',
    ['forearm'], ['biceps'], [
      'Держите гирю за дужку одной рукой перед собой.',
      'Перехватите её другой рукой, не опуская на пол.',
      'Меняйте хват. Это работа для кистей и предплечий.',
    ]),
  move('kb-pendulum', '0549', 'kettlebell pendulum', 'waist',
    ['obliques'], ['forearm', 'gluteal'], [
      'Встаньте прямо. Держите гирю двумя руками перед собой.',
      'Раскачивайте её из стороны в сторону, как маятник. Корпус слегка уходит за гирей.',
      'Не сгибайте спину. Движение идёт от боков.',
    ]),
  move('kb-world', '0532', 'kettlebell around the world', 'waist',
    ['obliques', 'front-deltoid'], ['forearm', 'side-deltoid'], [
      'Встаньте прямо. Держите гирю двумя руками у груди.',
      'Проведите её в сторону и разверните корпус вслед за руками.',
      'Верните гирю к центру и повторите в другую сторону.',
    ]),
  move('kb-cuckoo', '0536', 'kettlebell cuckoo lunge', 'upper legs',
    ['quadriceps', 'gluteal'], ['hamstring', 'front-deltoid'], [
      'Держите гирю двумя руками у груди.',
      'Сделайте глубокий выпад: заднее колено опускается к полу, переднее согнуто.',
      'Оттолкнитесь передней ногой и вернитесь в стойку. Чередуйте ноги.',
    ]),
  move('kb-high-pull', '0548', 'kettlebell bent-over high pull', 'back',
    ['upper-back', 'trapezius', 'side-deltoid'], ['biceps', 'forearm'], [
      'Наклонитесь, спина ровная. Гиря в двух руках у колен.',
      'Подтяните её к низу груди и доведите локти вверх, как в протяжке.',
      'Опустите гирю к коленям и повторите.',
    ]),
  move('kb-curl-alt', '0285', 'kettlebell alternating curl', 'upper arms',
    ['biceps'], ['forearm'], [
      'Встаньте прямо. Гиря в одной руке, рука выпрямлена.',
      'Согните руку и поднимите гирю к плечу. Локоть у корпуса.',
      'Опустите и сразу сделайте то же другой рукой.',
    ]),
]
