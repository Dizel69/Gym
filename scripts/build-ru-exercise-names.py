#!/usr/bin/env python3
"""Build the Russian exercise-name pack from the English catalogue titles.

Names are original translations for this app, assembled from gym phrases
(жим лёжа, тяга, приседания, подтягивания) plus equipment and grip. The
runtime pack is what the library shows when the language is Russian.
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXERCISES = ROOT / "frontend/src/lib/exercises-data.js"
JSON_OUT = ROOT / "scripts/exercise-name-sources/ru.json"
JS_OUT = ROOT / "frontend/src/exercise-names/ru.js"

# Longer phrases first. These are movement names, not equipment.
PHRASES = [
    ("clean and jerk", "взятие на грудь и толчок"),
    ("clean and press", "взятие на грудь и жим"),
    ("hang clean", "взятие на грудь с виса"),
    ("power clean", "взятие на грудь в сед"),
    ("snatch pull", "протяжка в рывке"),
    ("skull crusher", "французский жим лёжа"),
    ("skullcrusher", "французский жим лёжа"),
    ("romanian deadlift", "румынская тяга"),
    ("stiff leg deadlift", "тяга на прямых ногах"),
    ("straight leg deadlift", "становая тяга на прямых ногах"),
    ("sumo deadlift", "становая тяга сумо"),
    ("side deadlift", "становая тяга в сторону"),
    ("deadlift", "становая тяга"),
    ("rack pull", "тяга с плинтов"),
    ("pendlay row", "тяга Пендли"),
    ("upright row", "протяжка к подбородку"),
    ("bent over row", "тяга в наклоне"),
    ("bent-over row", "тяга в наклоне"),
    ("inverted row", "горизонтальные подтягивания"),
    ("rear delt row", "тяга на заднюю дельту"),
    ("high row", "тяга к груди"),
    ("seated row", "горизонтальная тяга"),
    ("low seated row", "горизонтальная тяга нижнего блока"),
    ("kayak row", "тяга как на байдарке"),
    ("renegade row", "тяга в упоре лёжа"),
    ("t-bar row", "тяга Т-грифа"),
    ("t bar row", "тяга Т-грифа"),
    ("row", "тяга"),
    ("lat pulldown", "тяга верхнего блока"),
    ("lateral pulldown", "тяга верхнего блока"),
    ("straight arm pulldown", "тяга прямыми руками"),
    ("underhand pulldown", "тяга верхнего блока обратным хватом"),
    ("pulldown", "тяга верхнего блока"),
    ("pull through", "протяжка между ног"),
    ("pull-through", "протяжка между ног"),
    ("bench press", "жим лёжа"),
    ("floor press", "жим лёжа на полу"),
    ("pin presses", "жим с ограничителей"),
    ("jm bench press", "жим JM"),
    ("jm press", "жим JM"),
    ("guillotine bench press", "жим гильотина"),
    ("chest press", "жим от груди"),
    ("shoulder press", "жим над головой"),
    ("overhead press", "жим над головой"),
    ("military press", "армейский жим"),
    ("arnold press", "жим Арнольда"),
    ("cuban press", "кубинский жим"),
    ("bradford press", "жим Брэдфорда"),
    ("bradford rocky press", "жим Брэдфорда с раскачкой"),
    ("push press", "жим с подседом"),
    ("french press", "французский жим"),
    ("tate press", "жим Тейта"),
    ("scott press", "жим Скотта"),
    ("seesaw press", "жим качели"),
    ("svend press", "жим Свенда"),
    ("side press", "жим в сторону"),
    ("w-press", "жим в форме W"),
    ("anti gravity press", "жим против гравитации"),
    ("face press", "жим к лицу"),
    ("leg press", "жим ногами"),
    ("calf press", "жим носками"),
    ("pallof press", "жим Паллофа"),
    ("press", "жим"),
    ("pushdown", "разгибание на трицепс на блоке"),
    ("push-up", "отжимания"),
    ("push up", "отжимания"),
    ("push-ups", "отжимания"),
    ("handstand push-up", "отжимания в стойке на руках"),
    ("diamond push-up", "алмазные отжимания"),
    ("pull-up", "подтягивания"),
    ("pull up", "подтягивания"),
    ("pull-ups", "подтягивания"),
    ("chin-up", "подтягивания обратным хватом"),
    ("chin-ups", "подтягивания обратным хватом"),
    ("chin up", "подтягивания обратным хватом"),
    ("muscle-up", "выход силой"),
    ("muscle up", "выход силой"),
    ("front lever", "передний вис"),
    ("back lever", "задний вис"),
    ("skin the cat", "скин зе кэт"),
    ("handstand", "стойка на руках"),
    ("planche", "планш"),
    ("maltese", "мальтийский крест"),
    ("l-sit", "уголок"),
    ("v-sit", "уголок V"),
    ("flag", "флажок"),
    ("human flag", "флажок"),
    ("preacher curl", "сгибание на скамье Скотта"),
    ("spider curl", "паучьи сгибания"),
    ("concentration curl", "концентрированное сгибание"),
    ("hammer curl", "молотковое сгибание"),
    ("drag curl", "сгибание с протяжкой"),
    ("reverse curl", "сгибание обратным хватом"),
    ("wrist curl", "сгибание запястий"),
    ("finger curls", "сгибание пальцев"),
    ("zottman curl", "сгибание Зоттмана"),
    ("waiter biceps curl", "сгибание официанта"),
    ("biceps curl", "сгибание на бицепс"),
    ("bicep curl", "сгибание на бицепс"),
    ("curl", "сгибание рук"),
    ("triceps extension", "разгибание на трицепс"),
    ("tricep extension", "разгибание на трицепс"),
    ("triceps dip", "отжимания на брусьях на трицепс"),
    ("tricep dips", "отжимания на брусьях на трицепс"),
    ("triceps dip", "отжимания на брусьях на трицепс"),
    ("chest dip", "отжимания на брусьях на грудь"),
    ("ring dips", "отжимания на кольцах"),
    ("korean dips", "корейские отжимания"),
    ("bench dip", "обратные отжимания от скамьи"),
    ("dip", "отжимания на брусьях"),
    ("dips", "отжимания на брусьях"),
    ("kickback", "разгибание руки назад"),
    ("kickbacks", "разгибания руки назад"),
    ("rear delt raise", "махи на заднюю дельту"),
    ("lateral raise", "махи в стороны"),
    ("front raise", "подъём перед собой"),
    ("forward raise", "подъём перед собой"),
    ("y-raise", "подъём в форме Y"),
    ("t-raise", "подъём в форме T"),
    ("shoulder raise", "подъём плеч"),
    ("calf raise", "подъём на носки"),
    ("leg raise", "подъём ног"),
    ("knee raise", "подъём коленей"),
    ("hip raise", "подъём таза"),
    ("glute-ham raise", "подъём на бицепс бедра"),
    ("raise", "подъём"),
    ("rear fly", "разведение на заднюю дельту"),
    ("reverse fly", "разведение на заднюю дельту"),
    ("fly", "разведение"),
    ("flyes", "разведения"),
    ("shrug", "шраги"),
    ("good morning", "наклоны гуд-морнинг"),
    ("hyperextension", "гиперэкстензия"),
    ("hyper extension", "гиперэкстензия"),
    ("back extension", "разгибание спины"),
    ("hip extension", "разгибание бедра"),
    ("leg extension", "разгибание ног"),
    ("extension", "разгибание"),
    ("leg curl", "сгибание ног"),
    ("hamstring curl", "сгибание на бицепс бедра"),
    ("hack squat", "гакк-приседания"),
    ("front squat", "фронтальные приседания"),
    ("goblet squat", "гоблет-приседания"),
    ("overhead squat", "приседания со штангой над головой"),
    ("pistol squat", "приседания пистолетом"),
    ("sissy squat", "сисси-приседания"),
    ("split squat", "болгарские приседания"),
    ("sumo squat", "приседания сумо"),
    ("jump squat", "приседания с выпрыгиванием"),
    ("squat", "приседания"),
    ("split squats", "выпады в ножницы"),
    ("lateral lunge", "боковой выпад"),
    ("walking lunge", "выпады в ходьбе"),
    ("rear lunge", "обратный выпад"),
    ("forward lunge", "выпад вперёд"),
    ("lunge", "выпад"),
    ("step-up", "зашагивание на тумбу"),
    ("step up", "зашагивание на тумбу"),
    ("glute bridge", "ягодичный мост"),
    ("hip thrust", "ягодичный мост"),
    ("bridge", "мост"),
    ("russian twist", "русские скручивания"),
    ("side bend", "наклоны в сторону"),
    ("sit-up", "подъём корпуса"),
    ("sit up", "подъём корпуса"),
    ("curl-up", "скручивание корпуса"),
    ("crunch", "скручивание"),
    ("crunches", "скручивания"),
    ("plank", "планка"),
    ("side plank", "боковая планка"),
    ("mountain climber", "альпинист"),
    ("burpee", "бёрпи"),
    ("flutter kicks", "ножницы ногами"),
    ("dead bug", "мёртвый жук"),
    ("bird dog", "птица-собака"),
    ("bear crawl", "медвежья походка"),
    ("inchworm", "гусеница"),
    ("farmers walk", "прогулка фермера"),
    ("farmer walk", "прогулка фермера"),
    ("monster walk", "походка монстра"),
    ("turkish get up", "турецкий подъём"),
    ("windmill", "мельница"),
    ("swing", "свинг"),
    ("snatch", "рывок"),
    ("clean", "взятие на грудь"),
    ("jerk", "толчок"),
    ("thruster", "трастер"),
    ("pullover", "пуловер"),
    ("rollout", "прокатка"),
    ("rollerout", "прокатка"),
    ("wrist roller", "кистевой ролл"),
    ("rope climb", "лазание по канату"),
    ("battling ropes", "канаты"),
    ("jump rope", "скакалка"),
    ("box jump", "запрыгивание на тумбу"),
    ("tire flip", "переворот покрышки"),
    ("sled", "сани"),
    ("stretch", "растяжка"),
    ("twist", "поворот"),
    ("rotation", "вращение"),
    ("circles", "круги"),
    ("shrug", "шраги"),
    ("air bike", "воздушный велосипед"),
    ("all fours", "на четвереньках"),
    ("arm slingers", "махи руками"),
    ("bicycle crunch", "скручивание велосипед"),
    ("jack knife", "складной нож"),
    ("skull press", "французский жим"),
    ("arm blaster", "с армбластером"),
    ("pull ups", "подтягивания"),
    ("chin ups", "подтягивания обратным хватом"),
    ("hammer press", "молотковый жим"),
    ("hammer curl", "молотковое сгибание"),
    ("hammer curls", "молотковые сгибания"),
    ("diamond push up", "алмазные отжимания"),
    ("deep push up", "глубокие отжимания"),
    ("russian twists", "русские скручивания"),
    ("crossovers", "кроссоверы"),
    ("cross over", "кроссовер"),
    ("crossover", "кроссовер"),
    ("full can", "полная банка"),
    ("frankenstein squat", "приседания Франкенштейна"),
    ("gironda sternum chin", "подтягивания Жиронды к грудине"),
    ("judo flip", "бросок в дзюдо"),
    ("upward facing dog", "собака мордой вверх"),
    ("bottoms up", "подъём таза"),
    ("butt ups", "подъём таза"),
    ("fixed back", "с фиксированной спиной"),
    ("world greatest stretch", "лучшая растяжка в мире"),
    ("sledge hammer", "кувалда"),
    ("spell caster", "заклинатель"),
    ("spider crawl", "паучьи"),
    ("shoulder tap", "касание плеча"),
    ("front lever reps", "повторения переднего виса"),
    ("muscle up", "выход силой"),
    ("reverse wrist curl", "сгибание запястий обратным хватом"),
    ("full squat", "полные приседания"),
    ("backward jump", "прыжок назад"),
    ("chest fly", "разведение на грудь"),
    ("clock push up", "отжимания по часам"),
    ("external shoulder rotation", "вращение плеча наружу"),
    ("shoulder external rotation", "вращение плеча наружу"),
    ("lower back stretch", "растяжка поясницы"),
    ("wind sprints", "ускорения"),
    ("l pull up", "подтягивания уголком"),
    ("dip cage", "на раме"),
    ("rear delt row shoulder", "тяга на заднюю дельту"),
    ("left hook", "левый хук"),
    ("chest stretch", "растяжка груди"),
    ("incline bench row", "тяга на наклонной скамье"),
    ("rope seated row", "горизонтальная тяга с канатом"),
]

MODIFIERS = [
    (r"close[- ]grip|narrow grip", "узким хватом"),
    (r"wide[- ]grip|wide grip|wide hand", "широким хватом"),
    (r"reverse[- ]grip|underhand|reverse grip", "обратным хватом"),
    (r"neutral grip|palms in|palm-in|palms down|palms up|parallel grip|hammer grip", "нейтральным хватом"),
    (r"pronated|pronate-grip|overhand", "хватом сверху"),
    (r"supinated", "хватом снизу"),
    (r"\bone arm\b|\bsingle arm\b|\bone hand\b", "одной рукой"),
    (r"\btwo arms?\b", "двумя руками"),
    (r"\bone leg\b|\bsingle leg\b|\bone legged\b", "на одной ноге"),
    (r"\btwo legs\b", "на двух ногах"),
    (r"\balternat\w+", "поочерёдно"),
    (r"\bincline[d]?\b", "на наклонной скамье"),
    (r"\bdecline[d]?\b", "на скамье с отрицательным наклоном"),
    (r"\bseated\b|\bsitted\b", "сидя"),
    (r"\bstanding\b", "стоя"),
    (r"\blying\b|\bsupine\b", "лёжа"),
    (r"\bprone\b", "лёжа на животе"),
    (r"\bkneeling\b", "на коленях"),
    (r"\boverhead\b|\bover head\b", "над головой"),
    (r"\bbehind (the )?neck\b|\bbehind head\b|\bback of the head\b", "из-за головы"),
    (r"\bbent[- ]over\b|\bbent over\b", "в наклоне"),
    (r"\bassisted\b", "с помощью"),
    (r"\bweighted\b", "с отягощением"),
    (r"\bside lying\b", "лёжа на боку"),
    (r"\brear\b", "назад"),
    (r"\bfront\b", "спереди"),
    (r"\blateral\b", "в сторону"),
    (r"\bvertical\b", "вертикально"),
    (r"\bhorizontal\b", "горизонтально"),
    (r"\blow\b", "нижний"),
    (r"\bhigh\b", "верхний"),
    (r"\binner\b", "внутренний"),
    (r"\bouter\b", "внешний"),
    (r"\breverse\b|\brevers\b", "обратный"),
    (r"\bstiff leg\b|\bstraight leg\b|\bstraight legs\b|\bleg straight\b", "на прямых ногах"),
    (r"\bbent knee\b|\bknees bent\b|\bbent knees\b", "с согнутыми коленями"),
    (r"\bstraight arm\b|\barms straight\b", "прямыми руками"),
    (r"\bbent arm\b", "с согнутыми руками"),
    (r"\bon knees\b|\bon knee\b", "с колен"),
    (r"\bon floor\b|\bfloor\b", "на полу"),
    (r"\bon bench\b|\bflat bench\b", "на скамье"),
    (r"\bon box\b", "на тумбе"),
    (r"\bwith rope\b|\brope attachment\b|\bwith rope attachment\b", "с канатом"),
    (r"\bwith towel\b", "с полотенцем"),
    (r"\bwith straps\b", "с лямками"),
    (r"\bwith support\b", "с опорой"),
    (r"\bon the wall\b|\bagainst wall\b|\bwall\b", "у стены"),
    (r"\b45\s*°|45 degrees|45 degree", "под 45°"),
]

WORDS = {
    "ab": "пресс", "abdominal": "пресс", "abs": "пресс", "adductor": "приводящие",
    "abduction": "отведение", "adduction": "приведение", "ankle": "голеностоп",
    "archer": "лучник", "arm": "рука", "arms": "руки", "back": "спина",
    "balance": "баланс", "bar": "гриф", "behind": "сзади", "bench": "скамья",
    "bicep": "бицепс", "biceps": "бицепс", "bike": "велосипед", "board": "доска",
    "bodyweight": "с собственным весом", "body": "тело", "bosu": "босу",
    "bottoms-up": "подъём таза", "butt-ups": "подъём таза", "butterfly": "бабочка",
    "calf": "икры", "calves": "икры", "captains": "римский стул", "chair": "стул",
    "chest": "грудь", "circular": "по кругу", "clap": "с хлопком", "clock": "по часам",
    "cocoons": "кокон", "cossack": "казачьи", "crab": "краб", "cross": "крест",
    "curtsey": "реверанс", "cycle": "велотренажёр", "delt": "дельта", "deltoid": "дельта",
    "depth": "в глубину", "diagonal": "по диагонали", "dog": "собака", "donkey": "ослик",
    "drop": "с падением", "dynamic": "динамическая", "elbow": "локоть", "elevator": "лифт",
    "elliptical": "эллипс", "equipment": "тренажёр", "external": "наружу",
    "fallout": "выкат", "femoral": "бедро", "figure": "восьмёрка", "flexion": "сгибание",
    "frog": "лягушка", "full": "полная", "glute": "ягодицы", "glutes": "ягодицы",
    "gluteus": "ягодицы", "gorilla": "горилла", "greatest": "лучшая", "grip": "хват",
    "gripless": "без хвата", "groin": "пах", "hack": "гакк", "half": "половина",
    "hamstring": "бицепс бедра", "hands": "руки", "hanging": "в висе", "heel": "пятка",
    "hindu": "индуистские", "hip": "таз", "hug": "объятие", "impossible": "невозможные",
    "internal": "внутрь", "inverse": "обратное", "iron": "железный", "isometric": "изометрия",
    "jack": "прыжки", "jackknife": "складной нож", "janda": "Янда", "jefferson": "Джефферсона",
    "jump": "прыжок", "jumps": "прыжки", "kick": "махи ногой", "kicks": "махи ногами",
    "kipping": "с киппингом", "knee": "колено", "knees": "колени", "landmine": "лендмайн",
    "lat": "широчайшие", "lean": "наклонный", "left": "левый", "leg": "нога", "legs": "ноги",
    "lift": "подъём", "london": "лондонский", "lower": "нижняя", "march": "марш",
    "medicine": "медбол", "mixed": "разнохват", "modified": "упрощённые", "narrow": "узкий",
    "neck": "шея", "negative": "негативное", "oblique": "косые", "olympic": "олимпийский",
    "otis": "Отис", "outside": "наружу", "parallel": "параллельный", "pec": "грудные",
    "pectoralis": "грудные", "pelvic": "таз", "pike": "угол", "pirate": "пират",
    "platform": "платформа", "plyo": "плиометрические", "plyometric": "плиометрические",
    "pose": "поза", "potty": "глубокие", "prisoner": "пленник", "quad": "квадрицепс",
    "quads": "квадрицепс", "quarter": "четверть", "quick": "быстрые", "reach": "дотягивание",
    "reclining": "лёжа", "reps": "повторения", "rocky": "Рокки", "roller": "ролл",
    "run": "бег", "runners": "бегуна", "scapula": "лопатки", "scapular": "лопатки",
    "scissor": "ножницы", "semi": "полу", "short": "короткий", "shoulder": "плечо",
    "shoulders": "плечи", "side": "бок", "single": "одной", "skater": "конькобежец",
    "ski": "лыжи", "slam": "бросок", "spell": "заклинатель", "sphinx": "сфинкс",
    "spider": "паук", "spine": "позвоночник", "sprint": "спринт", "sprints": "спринты",
    "stability": "фитбол", "stalder": "стальдер", "star": "звезда", "stationary": "стационарный",
    "step": "шаг", "stork": "цапля", "straddle": "ноги врозь", "straight": "прямой",
    "stride": "шаг", "sumo": "сумо", "superman": "супермен", "supported": "с опорой",
    "suspended": "на петлях", "swimmer": "пловец", "tap": "касание", "tennis": "теннисный",
    "three": "три", "throw": "бросок", "toe": "носок", "toes": "носки", "touch": "касание",
    "touchers": "касания", "towel": "полотенце", "treadmill": "дорожка", "tricep": "трицепс",
    "triceps": "трицепс", "tuck": "группировка", "twin": "двойная", "twisted": "со скручиванием",
    "twisting": "со скручиванием", "upper": "верхняя", "upward": "вверх", "walk": "ходьба",
    "walking": "ходьба", "wheel": "колесо", "wide": "широкий", "wind": "ветер",
    "wipers": "дворники", "world": "мира", "wrist": "запястье", "yoga": "йога",
    "zercher": "Зерхера", "around": "вокруг", "down": "вниз", "up": "вверх",
    "out": "наружу", "pass": "передача", "point": "точка", "power": "силовой",
    "range": "амплитуда", "motion": "движение", "response": "ответ", "multiple": "многократный",
    "release": "выпуск", "run": "бег", "depth": "глубина", "pyramid": "пирамида",
    "sequence": "серия", "style": "стиль", "support": "опора", "head": "голова",
    "hands": "руки", "hand": "рука", "feet": "стопы", "foot": "стопа",
    "between": "между", "ankles": "лодыжки", "elbows": "локти", "chest": "грудь",
    "major": "большая", "rectus": "прямая мышца", "femoris": "бедра", "piriformis": "грушевидная",
    "peroneals": "малоберцовые", "tibialis": "большеберцовая", "posterior": "задняя",
    "intermediate": "средняя", "dynamic": "динамическая", "isometric": "изометрическое",
    "self": "самостоятельно", "inverse": "обратное", "machine": "тренажёр",
    "cage": "рама", "staircase": "ступень", "stepmill": "степпер", "stepbox": "тумба",
    "dumbbell": "гантель", "barbell": "штанга", "cable": "блок", "band": "эспандер",
    "hammer": "молотковый", "rope": "канат", "push": "толчок", "pull": "тяга",
    "blaster": "армбластер", "ups": "подъёмы", "palm": "ладонь", "sit": "сидя",
    "double": "двойной", "stance": "стойка", "chin": "подбородок", "neutral": "нейтральный",
    "flexor": "сгибатель", "bars": "брусья", "bent": "согнутый", "squatting": "в приседе",
    "extended": "вытянутый", "raised": "поднятый", "zottman": "Зоттмана", "one": "одной",
    "tilt": "наклон", "raises": "подъёмы", "air": "воздушный", "all": "все",
    "fours": "четыре", "squad": "присед", "apart": "врозь", "astride": "ноги врозь",
    "forth": "вперёд", "backward": "назад", "bicycle": "велосипед", "knife": "нож",
    "skull": "французский", "lifting": "подъём", "skier": "лыжник", "speed": "скоростные",
    "basic": "базовое", "stabilization": "со стабилизацией", "butt": "таз",
    "concentration": "концентрированное", "variation": "вариант", "judo": "дзюдо",
    "flip": "бросок", "middle": "средний", "pro": "профессиональный", "stirrups": "рукоятки",
    "drive": "протяжка", "crossover": "кроссовер", "elevated": "приподнятая",
    "russian": "русский", "twists": "скручивания", "thibaudeau": "Тибодо", "deep": "глубокий",
    "diamond": "алмазные", "bowling": "боулинг", "contralateral": "противоположный",
    "can": "банка", "breeding": "разведение", "face": "лицо", "preacher": "Скотта",
    "pronate": "пронация", "rotate": "вращение", "carry": "перенос", "above": "выше",
    "upright": "вертикальная", "ground": "пол", "frankenstein": "Франкенштейна",
    "gironda": "Жиронды", "sternum": "грудина", "ham": "бицепс бедра", "bends": "сгибания",
    "reversed": "обратный", "advanced": "продвинутый", "hang": "вис", "position": "положение",
    "through": "через", "supper": "ужин", "hook": "хук", "boxing": "бокс",
    "gripper": "кистевой", "rotary": "вращательный", "pad": "подушка", "unilateral": "одной стороной",
    "catch": "ловля", "cobra": "кобра", "inside": "внутрь", "plus": "плюс", "big": "большой",
    "thrusts": "мост", "hyper": "гипер", "saw": "пила", "angle": "угол",
    "outstretched": "вытянутая", "slide": "скольжение", "pistol": "пистолет", "hops": "прыжки",
    "ergometer": "эргометр", "closer": "узкий", "angled": "под углом", "sledge": "кувалда",
    "caster": "заклинатель", "crawl": "ползание", "strap": "лямка", "abductor": "отводящая",
    "benches": "скамьи", "handle": "рукоять", "facing": "лицом", "squats": "приседания",
    "round": "круг", "curls": "сгибания", "pronation": "пронация", "supination": "супинация",
    "ball": "мяч", "forward": "вперёд", "clasped": "в замке", "squeeze": "сжатие",
    "two": "две", "depresor": "опускание", "retractor": "сведение", "slingers": "махи",
    "fixed": "фиксированный", "rocking": "с раскачкой", "bottoms": "таз", "pulley": "блок",
    "rotational": "с вращением", "trainer": "тренажёр",
}

EQUIPMENT = [
    (r"\bez[- ]barbell\b|\bez bar\b|\bez-bar\b", "с EZ-грифом"),
    (r"\bolympic barbell\b", "с олимпийской штангой"),
    (r"\btrap bar\b", "с трэп-грифом"),
    (r"\bcambered bar\b", "с изогнутым грифом"),
    (r"\bv[- ]bar\b|\bsz[- ]bar\b", "с V-грифом"),
    (r"\bresistance band\b", "с эспандером"),
    (r"\bmedicine ball\b", "с медболом"),
    (r"\bstability ball\b", "на фитболе"),
    (r"\bexercise ball\b", "на фитболе"),
    (r"\bbosu ball\b", "на босу"),
    (r"\bsmith machine\b|\bsmith\b", "в машине Смита"),
    (r"\bkettlebell\b", "с гирей"),
    (r"\bbarbell\b", "со штангой"),
    (r"\bdumbbells?\b", "с гантелями"),
    (r"\bcable\b", "на блоке"),
    (r"\bband\b", "с эспандером"),
    (r"\blever\b", "в тренажёре"),
    (r"\bsled\b", "в рычажном тренажёре"),
    (r"\broller\b", "на ролике"),
]

JUNK = {
    "the", "a", "an", "of", "on", "with", "and", "to", "from", "in", "at", "for",
    "by", "into", "over", "off", "or", "per", "via", "using", "using", "attachment",
    "pov", "version", "both", "under", "across", "during", "while", "than", "its",
    "this", "that", "your", "you", "is", "are",
}

TYPOS = [
    (r"\bpeacher\b", "preacher"),
    (r"\brevers\b", "reverse"),
    (r"\bsitted\b", "seated"),
    (r"\bflyes\b", "fly"),
    (r"\brollerer\b", "roller"),
    (r"\bkeens\b", "knees"),
    (r"\bhyght\b", "high"),
    (r"45в°", "45°"),
    (r"_", " "),
    (r"\bdepressor\b", "depressor"),
]


def load_exercises():
    text = EXERCISES.read_text()
    return json.loads(text[text.index("["):].rstrip().rstrip(";"))


def apply_patterns(text, patterns):
    found = []
    for pattern, russian in patterns:
        if re.search(pattern, text, flags=re.I):
            text = re.sub(pattern, " ", text, flags=re.I)
            if russian not in found:
                found.append(russian)
    return text, found


def translate(name):
    text = name.lower().strip()
    for pattern, repl in TYPOS:
        text = re.sub(pattern, repl, text, flags=re.I)
    tags = []
    if re.search(r"\(male\)|(?:^|[^\w])male(?:$|[^\w])", text):
        tags.append("мужской вариант")
        text = re.sub(r"\(male\)|\bmale\b", " ", text)
    if re.search(r"\(female\)|\bfemale\b", text):
        tags.append("женский вариант")
        text = re.sub(r"\(female\)|\bfemale\b", " ", text)
    version = re.search(r"v\.\s*(\d+)", text)
    if version:
        tags.append(f"вариант {version.group(1)}")
        text = re.sub(r"v\.\s*\d+", " ", text)
    if re.search(r"back pov", text):
        tags.append("вид сзади")
        text = re.sub(r"back pov", " ", text)
    if re.search(r"side pov", text):
        tags.append("вид сбоку")
        text = re.sub(r"side pov", " ", text)
    text = text.replace("(", " ").replace(")", " ").replace("-", " ")
    text = re.sub(r"\s+", " ", text)

    text, equipment = apply_patterns(text, EQUIPMENT)
    if "с гантелями" in equipment and re.search(r"\bone arm\b|\bsingle arm\b|\bone hand\b", text):
        equipment = ["с гантелью" if item == "с гантелями" else item for item in equipment]
    if "с гирей" in equipment and re.search(r"\bone arm\b", text):
        equipment = ["с гирей" if item == "с гирей" else item for item in equipment]

    phrases = sorted(PHRASES, key=lambda item: len(item[0]), reverse=True)
    for english, russian in phrases:
        text = re.sub(rf"\b{re.escape(english)}\b", russian, text)

    text, modifiers = apply_patterns(text, MODIFIERS)

    words = []
    for word in text.split():
        word = word.strip(".,;:!?")
        if not word or word in JUNK or word in {"v", "2", "3"}:
            continue
        if re.fullmatch(r"\d+", word) or word in {"°"}:
            words.append(word)
            continue
        mapped = WORDS.get(word)
        if mapped:
            words.append(mapped)
        elif re.search(r"[a-z]", word):
            words.append(word)
        else:
            words.append(word)

    core = " ".join(words)
    core = re.sub(r"\s+", " ", core).strip(" ,.-")
    parts = [core, *modifiers, *equipment, *tags]
    result = re.sub(r"\s+", " ", " ".join(part for part in parts if part)).strip()
    return result[:1].upper() + result[1:] if result else result


def main():
    exercises = load_exercises()
    names = {}
    leftovers = []
    for exercise in exercises:
        russian = translate(exercise["n"])
        names[exercise["id"]] = russian
        bad = re.findall(r"[A-Za-z]{3,}", russian)
        bad = [word for word in bad if word.lower() not in {"ez", "jm"}]
        if bad:
            leftovers.append((exercise["id"], exercise["n"], russian, bad))

    ordered = {exercise["id"]: names[exercise["id"]] for exercise in exercises}
    JSON_OUT.write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n")
    JS_OUT.write_text(
        "// generated by scripts/build-ru-exercise-names.py — edit that script, then rerun it\n"
        "export default " + json.dumps(ordered, ensure_ascii=False, separators=(",", ":")) + "\n"
    )
    print(f"{len(ordered)} names, {len(leftovers)} still contain English words")
    for row in leftovers[:80]:
        print(f"{row[0]}\t{row[1]}\t=> {row[2]}\t[{', '.join(row[3])}]")


if __name__ == "__main__":
    main()
