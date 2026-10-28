// Kettlebell movements that are not in the upstream exercise dataset.
// Drawings are original: a pencil figure with the working muscles in red, plus a short loop.
// They stay out of EXDB so the generated name packs still match it.

const still = name => `/kettlebell/${name}.jpg`
const clip = name => `/kettlebell/${name}.gif`
const pic = still

function move(id, n, bp, primaries, secondaries, st) {
  return {
    id, n, bp, eq: 'kettlebell',
    tg: primaries[0], mg: secondaries[0] || primaries[0],
    sm: secondaries, primaries, secondaries,
    img: still(id), gif: clip(id), st,
  }
}

export const KETTLEBELL_EXTRA = [
  {
    id: 'kb-halo',
    n: 'kettlebell halo',
    bp: 'shoulders',
    eq: 'kettlebell',
    tg: 'delts',
    mg: 'biceps',
    sm: ['biceps', 'traps'],
    primaries: ['front-deltoid', 'side-deltoid', 'rear-deltoid'],
    secondaries: ['biceps', 'trapezius', 'forearm'],
    img: pic('kb-halo'),
    gif: pic('kb-halo'),
    st: [
      'Встаньте прямо, ноги на ширине плеч. Возьмите гирю двумя руками за дужку у груди.',
      'Поднимите гирю и обводите её вокруг головы плотным кругом: перед лицом, сбоку, за затылком и снова вперёд.',
      'Локти широко, голова неподвижна. Крутится гиря, не шея.',
      'Закончите круг у груди и сразу начните следующий. Потом смените направление.',
    ],
  },
  {
    id: 'kb-around',
    n: 'kettlebell around the body',
    bp: 'waist',
    eq: 'kettlebell',
    tg: 'delts',
    mg: 'pectorals',
    sm: ['upper back', 'abs'],
    primaries: ['front-deltoid', 'side-deltoid', 'chest', 'rear-deltoid'],
    secondaries: ['upper-back', 'obliques', 'forearm'],
    img: pic('kb-around'),
    gif: pic('kb-around'),
    st: [
      'Встаньте прямо. Возьмите гирю двумя руками перед бёдрами.',
      'Проведите её по кругу вокруг корпуса: перед животом передайте из руки в руку, заведите за спину и снова передайте.',
      'Гиря идёт вплотную к телу, без замаха и без остановки.',
      'Сделайте несколько кругов в одну сторону, затем в другую.',
    ],
  },
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
    st: [
      'Поставьте гирю на пол между стоп, возьмите её одной рукой и поднимите к плечу. Гиря лежит на предплечье у ключицы, локоть прижат к корпусу. Свободная рука у подбородка.',
      'Вверх не жмите. Выпрямите руку вперёд на уровне плеча и толкните гирю от себя. Корпус немного уходит за рукой.',
      'По той же дуге верните гирю к плечу.',
      'Опустите гирю на пол, возьмите её другой рукой и повторите удар.',
    ],
  },
  move('kb-full-swing', 'kettlebell full swing', 'upper legs',
    ['gluteal', 'hamstring', 'front-deltoid'], ['quadriceps', 'lower-back', 'forearm'], [
      'Поставьте ноги чуть шире плеч. Возьмите гирю двумя руками и заведите её между ног.',
      'Качните бёдрами вперёд и пошлите гирю вверх до прямых рук над головой.',
      'Дайте ей вернуться между ног и сразу начните следующий мах.',
    ]),
  move('kb-upright', 'kettlebell upright row', 'shoulders',
    ['side-deltoid', 'trapezius'], ['biceps', 'front-deltoid', 'forearm'], [
      'Встаньте прямо. Держите гирю двумя руками перед бёдрами.',
      'Ведите её вверх к подбородку, локти расходятся в стороны и поднимаются выше кистей.',
      'Опустите гирю вниз и повторите.',
    ]),
  move('kb-deadlift', 'kettlebell deadlift', 'upper legs',
    ['hamstring', 'gluteal', 'lower-back'], ['quadriceps', 'forearm', 'trapezius'], [
      'Поставьте гирю между стоп. Возьмите её двумя руками, спина ровная, таз уходит назад.',
      'Встаньте, выпрямляя колени и таз. Гиря идёт вдоль ног.',
      'Вернитесь в наклон и повторите.',
    ]),
  move('kb-pass', 'kettlebell hand-to-hand pass', 'lower arms',
    ['forearm'], ['side-deltoid', 'obliques'], [
      'Встаньте прямо. Держите гирю одной рукой перед собой.',
      'Передайте её в другую руку у пояса, не роняя и не замахиваясь.',
      'Сразу передайте обратно. Кисти работают всё время.',
    ]),
  move('kb-side-bend', 'kettlebell side bend', 'waist',
    ['obliques'], ['forearm', 'quadriceps'], [
      'Встаньте прямо. Гиря в одной руке вдоль бедра.',
      'Наклонитесь в сторону гири и вернитесь вверх за счёт бока.',
      'Сделайте повторы на одну сторону, затем смените руку.',
    ]),
  move('kb-regrip', 'kettlebell regrip', 'lower arms',
    ['forearm'], ['biceps'], [
      'Держите гирю за дужку одной рукой перед собой.',
      'Перехватите её другой рукой, не опуская на пол.',
      'Меняйте хват. Это работа для кистей и предплечий.',
    ]),
  move('kb-plyo-squat', 'kettlebell plyo squat', 'upper legs',
    ['quadriceps', 'gluteal'], ['hamstring', 'calves'], [
      'Держите гирю двумя руками у груди.',
      'Присядьте и сразу выпрыгните вверх, гиря остаётся у груди.',
      'Приземлитесь мягко и сразу уйдите в следующий присед.',
    ]),
  move('kb-curl', 'kettlebell two-arm curl', 'upper arms',
    ['biceps'], ['forearm'], [
      'Встаньте прямо. Возьмите гирю двумя руками за дужку, руки выпрямлены.',
      'Согните руки и поднимите гирю к груди. Локти остаются у корпуса.',
      'Опустите и повторите.',
    ]),
  move('kb-clean-press', 'kettlebell clean and press', 'full body',
    ['front-deltoid', 'quadriceps', 'gluteal'], ['triceps', 'hamstring', 'forearm', 'trapezius'], [
      'Поставьте гирю между стоп и возьмите её одной рукой.',
      'Поднимите её к плечу одним движением: гиря ложится на предплечье.',
      'Выжмите вверх до прямой руки и верните к плечу.',
      'Опустите на пол и повторите другой рукой.',
    ]),
  move('kb-swing-one', 'kettlebell one-arm swing', 'upper legs',
    ['gluteal', 'hamstring'], ['quadriceps', 'lower-back', 'forearm'], [
      'Ноги на ширине плеч. Гиря в одной руке между ног.',
      'Качните бёдрами и пошлите гирю вперёд до высоты плеча. Свободная рука не держит дужку.',
      'Дайте ей вернуться между ног и повторите. Затем смените руку.',
    ]),
  move('kb-pendulum', 'kettlebell pendulum', 'waist',
    ['obliques'], ['forearm', 'gluteal'], [
      'Встаньте прямо. Держите гирю двумя руками перед собой.',
      'Раскачивайте её из стороны в сторону, как маятник. Корпус слегка уходит за гирей.',
      'Не сгибайте спину. Движение идёт от боков.',
    ]),
  move('kb-oh-ext', 'kettlebell overhead extension', 'upper arms',
    ['triceps'], ['front-deltoid', 'forearm'], [
      'Поднимите гирю двумя руками над головой.',
      'Согните локти и опустите гирю за голову. Локти смотрят вверх.',
      'Разогните руки и верните гирю над головой.',
    ]),
  move('kb-world', 'kettlebell around the world', 'waist',
    ['obliques', 'front-deltoid'], ['forearm', 'side-deltoid'], [
      'Встаньте прямо. Держите гирю двумя руками у груди.',
      'Проведите её в сторону и разверните корпус вслед за руками.',
      'Верните гирю к центру и повторите в другую сторону.',
    ]),
  move('kb-cuckoo', 'kettlebell cuckoo lunge', 'upper legs',
    ['quadriceps', 'gluteal'], ['hamstring', 'front-deltoid'], [
      'Держите гирю двумя руками у груди.',
      'Сделайте глубокий выпад: заднее колено опускается к полу, переднее согнуто.',
      'Оттолкнитесь передней ногой и вернитесь в стойку. Чередуйте ноги.',
    ]),
  move('kb-burst', 'kettlebell snatch', 'full body',
    ['front-deltoid', 'gluteal', 'trapezius'], ['hamstring', 'forearm', 'triceps'], [
      'Гиря в одной руке между ног, свободная рука в стороне.',
      'Качните бёдрами и вырвите гирю вверх до прямой руки над головой.',
      'Опустите её обратно между ног и повторите. Затем смените руку.',
    ]),
  move('kb-high-pull', 'kettlebell bent-over high pull', 'back',
    ['upper-back', 'trapezius', 'side-deltoid'], ['biceps', 'forearm'], [
      'Наклонитесь, спина ровная. Гиря в двух руках у колен.',
      'Подтяните её к низу груди и доведите локти вверх, как в протяжке.',
      'Опустите гирю к коленям и повторите.',
    ]),
  move('kb-curl-alt', 'kettlebell alternating curl', 'upper arms',
    ['biceps'], ['forearm'], [
      'Встаньте прямо. Гиря в одной руке, рука выпрямлена.',
      'Согните руку и поднимите гирю к плечу. Локоть у корпуса.',
      'Опустите и сразу сделайте то же другой рукой.',
    ]),
  move('kb-press', 'kettlebell one-arm press', 'shoulders',
    ['front-deltoid', 'triceps'], ['side-deltoid', 'trapezius'], [
      'Возьмите гирю к плечу. Она лежит на предплечье, локоть внизу.',
      'Выжмите её вверх до прямой руки. Корпус не отклоняйте.',
      'Опустите к плечу и повторите. Затем смените руку.',
    ]),
  move('kb-protyazhka', 'kettlebell upright pull', 'shoulders',
    ['trapezius', 'side-deltoid'], ['biceps', 'forearm'], [
      'Встаньте прямо. Гиря в двух руках перед бёдрами.',
      'Подрывным движением бёдер протяните гирю вверх до уровня плеч, локти в стороны.',
      'Опустите её вниз и повторите.',
    ]),
]
