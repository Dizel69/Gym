// Three kettlebell movements that are not in the upstream exercise dataset.
// Diagrams are original: a gray figure with the working muscles in red.
// They stay out of EXDB so the Portuguese and Hungarian name packs still match it.

const pic = name => `/kettlebell/${name}.jpg`

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
]
