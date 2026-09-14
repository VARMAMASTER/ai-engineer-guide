import type { Confidence, NutritionSource, Recipe } from '../types'

/**
 * Composed dishes, as recipes. This is the file that makes the app answer
 * "dal" with a bowl of dal instead of a bag of lentils.
 *
 * ---------------------------------------------------------------------------
 * HOW TO READ A ROW, AND THE TWO THINGS THAT MATTER MOST
 *
 * `items` are RAW/DRY weights going into the pot, each in the state its
 * ingredient row is published in. 60 g of `toor-dal` is 60 g of dry dal, not
 * cooked. Water is listed as an ingredient like anything else.
 *
 * `yieldG` is the COOKED weight of the whole batch, and it is the only reason
 * these numbers are usable. 60 g of dry dal plus 320 g of water is 400 g of
 * dal tadka, so the dish is 86 kcal per 100 g and a katori of it is 130 —
 * whereas the dry dal is 343 kcal per 100 g. Divide by the wrong denominator
 * and you publish a dish at four times its real energy density. Every yield
 * here is a considered figure for a normal home pan, and `yieldRatio()` exists
 * so a wrong one is visible on the page rather than buried in an arithmetic.
 *
 * ---------------------------------------------------------------------------
 * WHAT THESE ARE NOT
 *
 * They are not THE recipe for anything. Every one of these dishes is cooked
 * forty different ways in forty households, and the single largest source of
 * variation in the energy figure is the oil — a restaurant paneer butter
 * masala is not the same food as a home one. That is exactly why the model
 * stores a recipe rather than a dish: more oil is a different recipe, not an
 * argument. Confidence is therefore never 'high' on a recipe, and the database
 * enforces that with a check constraint.
 * ---------------------------------------------------------------------------
 */

interface RecipeSeed {
  id: string
  name: string
  aliases: string[]
  region?: string
  summary?: string
  method?: string
  /** `[ingredientId, grams]`, or `[ingredientId, grams, note]`. */
  items: ([string, number] | [string, number, string])[]
  yieldG: number
  servings: [label: string, grams: number][]
  source?: NutritionSource
  confidence: Confidence
  note?: string
  prominence?: number
}

const SEED: RecipeSeed[] = [
  {
    id: 'dal-tadka', name: 'Dal tadka', aliases: ['dal', 'daal', 'toor dal', 'arhar dal', 'tadka dal', 'dal fry tadka', 'pappu'],
    region: 'North India', prominence: 100,
    summary: 'Toor dal boiled soft, finished with a ghee tempering of cumin and garlic.',
    method: 'Pressure-cook the dal with turmeric and water. Temper cumin, garlic and chilli in ghee, add onion and tomato, and stir the tempering through the cooked dal.',
    items: [['toor-dal', 60], ['water', 320], ['onion', 40], ['tomato', 50], ['ghee', 10], ['cumin-seed', 2], ['turmeric', 1], ['chilli-powder', 1], ['garlic', 6], ['green-chilli', 4], ['salt', 3], ['coriander-leaves', 5]],
    yieldG: 400, servings: [['1 katori', 150], ['1 bowl', 200]],
    confidence: 'medium', note: 'A home dal with one teaspoon of ghee. A restaurant dal tadka commonly carries two to three times the fat.',
  },
  {
    id: 'dal-fry', name: 'Dal fry', aliases: ['dal', 'daal fry', 'masoor dal', 'yellow dal', 'dal curry'],
    region: 'North India', prominence: 70,
    summary: 'Masoor dal cooked down with a fried onion-tomato masala rather than a quick tempering.',
    items: [['masoor-dal', 60], ['water', 300], ['onion', 60], ['tomato', 60], ['sunflower-oil', 14], ['cumin-seed', 2], ['turmeric', 1], ['coriander-powder', 2], ['chilli-powder', 1.5], ['garlic', 6], ['ginger', 4], ['salt', 3], ['coriander-leaves', 5]],
    yieldG: 410, servings: [['1 katori', 150], ['1 bowl', 200]],
    confidence: 'medium',
  },
  {
    id: 'sambar', name: 'Sambar', aliases: ['sambhar', 'saambar', 'sambar curry', 'kuzhambu', 'pappu charu'],
    region: 'South India', prominence: 95,
    summary: 'Toor dal with tamarind and mixed vegetables, tempered with mustard and curry leaves.',
    method: 'Cook the dal soft. Boil the vegetables in tamarind water with sambar spices, add the dal, and finish with a mustard-and-curry-leaf tempering in gingelly oil.',
    items: [['toor-dal', 50], ['water', 420], ['tamarind-pulp', 15], ['onion', 30], ['tomato', 40], ['drumstick', 40], ['bottle-gourd', 40], ['carrot', 25], ['coriander-powder', 4], ['chilli-powder', 2], ['turmeric', 1], ['fenugreek-seed', 1], ['mustard-seed', 2], ['curry-leaves', 2], ['asafoetida', 0.3], ['sesame-oil', 8], ['salt', 4], ['coriander-leaves', 5]],
    yieldG: 560, servings: [['1 katori', 150], ['1 bowl', 200]],
    confidence: 'medium', note: 'Sambar vegetables change with the season and the household; this is a common mixed-vegetable version. Search for "sambar powder" if you want the spice blend rather than the dish.',
  },
  {
    id: 'rasam', name: 'Rasam', aliases: ['rasam', 'saaru', 'pepper rasam', 'tomato rasam', 'chaaru'],
    region: 'South India', prominence: 60,
    summary: 'A thin tamarind and pepper broth with a little dal for body.',
    items: [['tamarind-pulp', 20], ['tomato', 60], ['toor-dal', 15], ['water', 450], ['black-pepper', 2], ['cumin-seed', 3], ['garlic', 4], ['mustard-seed', 1], ['curry-leaves', 2], ['asafoetida', 0.3], ['coriander-leaves', 5], ['sesame-oil', 5], ['salt', 4], ['turmeric', 0.5]],
    yieldG: 520, servings: [['1 katori', 150], ['1 bowl', 200]],
    confidence: 'medium',
  },
  {
    id: 'idli', name: 'Idli', aliases: ['idly', 'steamed idli', 'rice cake', 'iddli'],
    region: 'South India', prominence: 95,
    summary: 'Fermented rice and urad dal batter, steamed. No oil at all.',
    method: 'Soak parboiled rice and urad dal separately, grind, mix, ferment overnight, and steam in moulds for ten minutes.',
    items: [['parboiled-rice-raw', 100], ['urad-dal', 25], ['fenugreek-seed', 1], ['salt', 3], ['water', 185]],
    yieldG: 300, servings: [['1 idli', 45], ['2 idlis', 90], ['3 idlis', 135]],
    confidence: 'medium', note: 'Idli is one of the few Indian staples with no added fat, which is most of why it is light. Searching a barcode database for "idli" returns idli rava — the flour — instead of this.',
  },
  {
    id: 'dosa', name: 'Dosa, plain', aliases: ['dosai', 'sada dosa', 'plain dosa', 'thosai'],
    region: 'South India', prominence: 95,
    summary: 'The same family of batter as idli, spread thin on a tawa with a little oil.',
    items: [['rice-white-raw', 100], ['urad-dal', 30], ['fenugreek-seed', 1], ['salt', 3], ['water', 200], ['sunflower-oil', 6]],
    yieldG: 330, servings: [['1 dosa', 80]],
    confidence: 'medium', note: 'How much oil goes on the tawa is the whole variable here; a restaurant dosa gets several times this.',
  },
  {
    id: 'masala-dosa', name: 'Masala dosa', aliases: ['masala dosai', 'mysore masala dosa', 'potato dosa'],
    region: 'South India', prominence: 85,
    summary: 'A dosa folded around a turmeric potato filling.',
    items: [['rice-white-raw', 100], ['urad-dal', 30], ['fenugreek-seed', 1], ['salt', 4], ['water', 200], ['sunflower-oil', 10], ['potato', 120], ['onion', 30], ['mustard-seed', 1], ['turmeric', 0.5], ['green-chilli', 4], ['curry-leaves', 1]],
    yieldG: 470, servings: [['1 dosa', 235]],
    confidence: 'medium',
  },
  {
    id: 'poha', name: 'Poha', aliases: ['pohe', 'kanda poha', 'chivda', 'aval upma', 'atukula upma', 'flattened rice breakfast'],
    region: 'Maharashtra', prominence: 85,
    summary: 'Flattened rice softened and tossed with potato, onion, peanuts and turmeric.',
    items: [['poha', 60], ['water', 45, 'absorbed while rinsing'], ['potato', 40], ['onion', 40], ['groundnut', 8], ['sunflower-oil', 6], ['mustard-seed', 1], ['turmeric', 0.5], ['green-chilli', 4], ['curry-leaves', 2], ['salt', 2], ['lemon-juice', 8], ['sugar', 2], ['coriander-leaves', 5]],
    yieldG: 215, servings: [['1 plate', 215], ['1 katori', 120]],
    confidence: 'medium',
  },
  {
    id: 'upma', name: 'Upma', aliases: ['uppuma', 'rava upma', 'sooji upma', 'uppittu'],
    region: 'South India', prominence: 75,
    summary: 'Roasted semolina cooked in seasoned water until it comes together.',
    items: [['rava', 60], ['water', 180], ['onion', 40], ['sunflower-oil', 8], ['mustard-seed', 1], ['urad-dal', 2], ['chana-dal', 2], ['green-chilli', 4], ['curry-leaves', 2], ['ginger', 3], ['salt', 2], ['coriander-leaves', 4]],
    yieldG: 265, servings: [['1 plate', 250], ['1 katori', 140]],
    confidence: 'medium',
  },
  {
    id: 'rajma-masala', name: 'Rajma masala', aliases: ['rajma', 'kidney bean curry', 'rajma curry', 'lal lobia curry'],
    region: 'North India', prominence: 85,
    summary: 'Kidney beans simmered in an onion-tomato masala until the gravy thickens.',
    items: [['rajma', 60], ['water', 300], ['onion', 60], ['tomato', 80], ['ginger', 5], ['garlic', 6], ['sunflower-oil', 12], ['cumin-seed', 2], ['coriander-powder', 3], ['chilli-powder', 2], ['turmeric', 1], ['garam-masala', 2], ['salt', 4], ['coriander-leaves', 5]],
    yieldG: 420, servings: [['1 katori', 150], ['1 bowl', 200]],
    confidence: 'medium',
  },
  {
    id: 'chole', name: 'Chole (chana masala)', aliases: ['chana masala', 'chhole', 'chickpea curry', 'chole bhature filling', 'kabuli chana curry'],
    region: 'North India', prominence: 85,
    summary: 'Boiled chickpeas in a dark, heavily spiced onion-tomato gravy.',
    items: [['kabuli-chana', 60], ['water', 300], ['onion', 60], ['tomato', 80], ['ginger', 5], ['garlic', 6], ['sunflower-oil', 12], ['cumin-seed', 2], ['coriander-powder', 4], ['chilli-powder', 2], ['turmeric', 1], ['garam-masala', 3], ['salt', 4], ['coriander-leaves', 5]],
    yieldG: 420, servings: [['1 katori', 150], ['1 bowl', 200]],
    confidence: 'medium',
  },
  {
    id: 'paneer-butter-masala', name: 'Paneer butter masala', aliases: ['paneer', 'butter paneer', 'paneer makhani', 'paneer makhanwala'],
    region: 'North India', prominence: 95,
    summary: 'Paneer in a tomato-cashew gravy enriched with butter and cream.',
    method: 'Blend cooked tomato with soaked cashew, cook down in butter with the spices, finish with cream and crushed kasuri methi, and fold the paneer in at the end.',
    items: [['paneer', 100], ['tomato', 150], ['onion', 40], ['cashew', 15], ['butter', 15], ['cream', 20], ['ginger', 5], ['garlic', 5], ['chilli-powder', 2], ['garam-masala', 2], ['kasuri-methi', 1], ['sugar', 3], ['salt', 3], ['water', 80]],
    yieldG: 380, servings: [['1 katori', 150], ['1 bowl', 200]],
    confidence: 'low', note: 'The richest dish in this set and the one that varies most: a restaurant version can carry twice this butter and cream. Low confidence for that reason, not because the arithmetic is shakier.',
  },
  {
    id: 'palak-paneer', name: 'Palak paneer', aliases: ['paneer', 'spinach paneer', 'palak panner', 'saag paneer'],
    region: 'North India', prominence: 80,
    summary: 'Paneer cubes in a blended spinach gravy.',
    items: [['spinach', 200], ['paneer', 80], ['onion', 40], ['tomato', 40], ['garlic', 6], ['ginger', 4], ['sunflower-oil', 10], ['cumin-seed', 2], ['garam-masala', 2], ['cream', 15], ['salt', 3], ['water', 60]],
    yieldG: 380, servings: [['1 katori', 150], ['1 bowl', 200]],
    confidence: 'medium',
  },
  {
    id: 'matar-paneer', name: 'Matar paneer', aliases: ['paneer', 'peas paneer', 'mutter paneer', 'paneer matar'],
    region: 'North India', prominence: 70,
    summary: 'Paneer and green peas in a tomato gravy, lighter than the butter masala.',
    items: [['paneer', 80], ['green-peas', 80], ['tomato', 100], ['onion', 50], ['sunflower-oil', 12], ['ginger', 4], ['garlic', 4], ['coriander-powder', 3], ['turmeric', 1], ['chilli-powder', 1.5], ['garam-masala', 2], ['salt', 3], ['water', 80]],
    yieldG: 380, servings: [['1 katori', 150], ['1 bowl', 200]],
    confidence: 'medium',
  },
  {
    id: 'dal-makhani', name: 'Dal makhani', aliases: ['dal', 'makhani dal', 'kali dal', 'black dal'],
    region: 'Punjab', prominence: 80,
    summary: 'Urad dal and a little rajma cooked long and finished with butter and cream.',
    items: [['urad-dal', 50], ['rajma', 15], ['water', 350], ['butter', 15], ['cream', 20], ['tomato', 60], ['onion', 30], ['ginger', 5], ['garlic', 6], ['chilli-powder', 2], ['garam-masala', 2], ['salt', 3]],
    yieldG: 430, servings: [['1 katori', 150], ['1 bowl', 200]],
    confidence: 'low', note: 'Restaurant dal makhani is finished with far more butter than this and is not comparable. Made with split urad here because whole black gram is not yet in the ingredient set.',
  },
  {
    id: 'chicken-curry', name: 'Chicken curry', aliases: ['murgh curry', 'chicken masala', 'chicken gravy', 'kodi kura', 'chicken salna'],
    region: 'India', prominence: 90,
    summary: 'Bone-in chicken in an onion-tomato-curd gravy.',
    items: [['chicken-with-skin', 250], ['onion', 100], ['tomato', 80], ['sunflower-oil', 20], ['ginger', 8], ['garlic', 8], ['coriander-powder', 5], ['chilli-powder', 3], ['turmeric', 2], ['garam-masala', 3], ['curd', 40], ['salt', 5], ['coriander-leaves', 6], ['water', 150]],
    yieldG: 520, servings: [['1 katori', 150], ['1 bowl', 200]],
    confidence: 'medium', note: 'Weights are as bought, bone included, which is how chicken is sold at an Indian counter. The bone is part of the yield and not part of what you eat, so a serving of this understates the meat slightly.',
  },
  {
    id: 'chicken-biryani', name: 'Chicken biryani', aliases: ['biryani', 'biriyani', 'chicken biriyani', 'dum biryani', 'murgh biryani'],
    region: 'India', prominence: 95,
    summary: 'Basmati rice layered with marinated chicken and fried onion, finished on a slow flame.',
    items: [['basmati-raw', 150], ['chicken-with-skin', 250], ['curd', 80], ['onion', 100], ['sunflower-oil', 25], ['ghee', 10], ['garam-masala', 4], ['chilli-powder', 3], ['turmeric', 1], ['ginger', 8], ['garlic', 8], ['green-chilli', 6], ['coriander-leaves', 8], ['bay-leaf', 1], ['cardamom', 1], ['cinnamon', 1], ['clove', 0.6], ['salt', 7], ['water', 300]],
    yieldG: 900, servings: [['1 plate', 350], ['1 katori', 180]],
    confidence: 'low', note: 'Biryani is the hardest dish here to pin down: the oil, the meat-to-rice ratio and the portion all swing enormously between a home pot and a restaurant handi. Treat this as a home version.',
  },
  {
    id: 'veg-pulao', name: 'Vegetable pulao', aliases: ['pulao', 'pulav', 'veg rice', 'pilaf', 'vegetable rice'],
    region: 'India', prominence: 60,
    summary: 'Basmati rice cooked with whole spices and mixed vegetables in one pot.',
    items: [['basmati-raw', 120], ['green-peas', 50], ['carrot', 50], ['french-beans', 40], ['onion', 50], ['ghee', 12], ['sunflower-oil', 8], ['cumin-seed', 2], ['bay-leaf', 0.5], ['cardamom', 0.6], ['cinnamon', 1], ['clove', 0.4], ['salt', 5], ['water', 260]],
    yieldG: 600, servings: [['1 plate', 300], ['1 katori', 160]],
    confidence: 'medium',
  },
  {
    id: 'curd-rice', name: 'Curd rice', aliases: ['thayir sadam', 'dahi chawal', 'daddojanam', 'yoghurt rice', 'mosaranna'],
    region: 'South India', prominence: 75,
    summary: 'Cooked rice mashed into curd and milk, with a light mustard tempering.',
    items: [['rice-white-cooked', 250], ['curd', 150], ['milk-toned', 40], ['salt', 2], ['mustard-seed', 1], ['urad-dal', 2], ['green-chilli', 4], ['curry-leaves', 2], ['ginger', 3], ['sunflower-oil', 5], ['coriander-leaves', 4]],
    yieldG: 460, servings: [['1 katori', 180], ['1 bowl', 250]],
    confidence: 'medium', note: 'Built on cooked rice rather than raw, because curd rice is what you make from yesterday’s rice. The yield is therefore close to the input weight.',
  },
  {
    id: 'lemon-rice', name: 'Lemon rice', aliases: ['chitranna', 'elumichai sadam', 'nimmakaya pulihora', 'lime rice'],
    region: 'South India', prominence: 55,
    summary: 'Cooked rice tossed with a turmeric tempering, peanuts and lemon juice.',
    items: [['rice-white-cooked', 250], ['lemon-juice', 25], ['groundnut', 15], ['sesame-oil', 12], ['mustard-seed', 1], ['chana-dal', 3], ['urad-dal', 3], ['turmeric', 1], ['green-chilli', 5], ['curry-leaves', 2], ['asafoetida', 0.3], ['salt', 3]],
    yieldG: 310, servings: [['1 katori', 160], ['1 plate', 300]],
    confidence: 'medium',
  },
  {
    id: 'aloo-gobi', name: 'Aloo gobi', aliases: ['potato cauliflower', 'gobi aloo', 'aloo gobhi sabzi'],
    region: 'North India', prominence: 70,
    summary: 'Potato and cauliflower dry-cooked with turmeric and cumin.',
    items: [['potato', 150], ['cauliflower', 200], ['onion', 40], ['tomato', 40], ['sunflower-oil', 15], ['cumin-seed', 2], ['turmeric', 1], ['coriander-powder', 3], ['chilli-powder', 1.5], ['garam-masala', 1.5], ['salt', 4], ['coriander-leaves', 5]],
    yieldG: 340, servings: [['1 katori', 150]],
    confidence: 'medium', note: 'A dry sabzi loses water rather than gaining it, so the yield here is well BELOW the input weight — the opposite of a dal.',
  },
  {
    id: 'bhindi-masala', name: 'Bhindi masala', aliases: ['okra sabzi', 'bhindi fry', 'lady finger sabzi', 'vendakkai poriyal'],
    region: 'North India', prominence: 60,
    summary: 'Okra sautéed dry with onion, tomato and ground spices.',
    items: [['okra', 250], ['onion', 60], ['tomato', 50], ['sunflower-oil', 18], ['cumin-seed', 2], ['turmeric', 1], ['coriander-powder', 3], ['chilli-powder', 1.5], ['garam-masala', 1.5], ['salt', 3]],
    yieldG: 280, servings: [['1 katori', 140]],
    confidence: 'medium',
  },
  {
    id: 'baingan-bharta', name: 'Baingan bharta', aliases: ['brinjal bharta', 'eggplant mash', 'bharta', 'vankaya pachadi'],
    region: 'North India', prominence: 55,
    summary: 'Fire-roasted brinjal mashed into a fried onion-tomato base.',
    items: [['brinjal', 400], ['onion', 80], ['tomato', 80], ['sunflower-oil', 18], ['ginger', 5], ['garlic', 6], ['green-chilli', 6], ['cumin-seed', 2], ['turmeric', 1], ['chilli-powder', 1.5], ['salt', 4], ['coriander-leaves', 6]],
    yieldG: 400, servings: [['1 katori', 150]],
    confidence: 'medium',
  },
  {
    id: 'roti', name: 'Roti (chapati)', aliases: ['chapati', 'phulka', 'chapathi', 'wheat roti', 'rotli'],
    region: 'India', prominence: 100,
    summary: 'Whole wheat dough rolled thin and cooked dry on a tawa.',
    items: [['atta', 100], ['water', 65], ['salt', 1]],
    yieldG: 145, servings: [['1 roti', 40], ['2 rotis', 80]],
    confidence: 'medium', note: 'No fat at all — a phulka. A roti smeared with ghee afterwards is 40 to 50 kcal heavier per piece, which is the single most common reason a logged roti is wrong.',
  },
  {
    id: 'paratha', name: 'Paratha, plain', aliases: ['parantha', 'plain paratha', 'lachha paratha', 'tawa paratha'],
    region: 'North India', prominence: 75,
    summary: 'Layered wheat flatbread, cooked with ghee on the tawa.',
    items: [['atta', 100], ['water', 60], ['sunflower-oil', 10, 'in the dough'], ['ghee', 8, 'on the tawa'], ['salt', 1]],
    yieldG: 165, servings: [['1 paratha', 55]],
    confidence: 'medium',
  },
  {
    id: 'aloo-paratha', name: 'Aloo paratha', aliases: ['potato paratha', 'aloo parantha', 'stuffed paratha'],
    region: 'Punjab', prominence: 80,
    summary: 'Wheat flatbread stuffed with spiced mashed potato.',
    items: [['atta', 80], ['potato', 120], ['water', 45], ['ghee', 12], ['green-chilli', 4], ['coriander-leaves', 5], ['cumin-seed', 1], ['chilli-powder', 1], ['salt', 3]],
    yieldG: 250, servings: [['1 paratha', 125]],
    confidence: 'medium',
  },
  {
    id: 'puri', name: 'Puri', aliases: ['poori', 'fried puri', 'luchi', 'bhatura style puri'],
    region: 'India', prominence: 65,
    summary: 'Wheat dough rolled small and deep-fried so it puffs.',
    items: [['atta', 100], ['water', 55], ['sunflower-oil', 30, 'absorbed in frying'], ['salt', 1]],
    yieldG: 165, servings: [['1 puri', 25], ['2 puris', 50]],
    confidence: 'low', note: 'The oil figure is the weak link and it is the one that matters: how much a puri absorbs depends on the oil temperature and the dough, and estimates range from 15% to 35% of the dough weight. Assumed 30 g here for 100 g of flour.',
  },
  {
    id: 'khichdi', name: 'Khichdi', aliases: ['khichri', 'moong dal khichdi', 'pongal style khichdi', 'kichadi'],
    region: 'India', prominence: 70,
    summary: 'Rice and moong dal cooked soft together with turmeric and ghee.',
    items: [['rice-white-raw', 60], ['moong-dal', 40], ['water', 400], ['ghee', 10], ['cumin-seed', 2], ['turmeric', 1], ['ginger', 3], ['salt', 3]],
    yieldG: 460, servings: [['1 katori', 180], ['1 bowl', 250]],
    confidence: 'medium',
  },
  {
    id: 'ven-pongal', name: 'Ven pongal', aliases: ['pongal', 'khara pongal', 'ghee pongal', 'kara pongal'],
    region: 'Tamil Nadu', prominence: 55,
    summary: 'Rice and moong dal mashed together with pepper, cumin, ghee and cashew.',
    items: [['rice-white-raw', 70], ['moong-dal', 30], ['water', 380], ['ghee', 15], ['black-pepper', 2], ['cumin-seed', 2], ['cashew', 10], ['ginger', 4], ['curry-leaves', 2], ['asafoetida', 0.3], ['salt', 3]],
    yieldG: 440, servings: [['1 katori', 180]],
    confidence: 'medium',
  },
  {
    id: 'medu-vada', name: 'Medu vada', aliases: ['vada', 'uzhunnu vada', 'urad vada', 'garelu', 'medhu vadai'],
    region: 'South India', prominence: 60,
    summary: 'Ground urad dal batter shaped into rings and deep-fried.',
    items: [['urad-dal', 80], ['water', 60], ['sunflower-oil', 25, 'absorbed in frying'], ['green-chilli', 5], ['ginger', 4], ['curry-leaves', 2], ['black-pepper', 1], ['salt', 2]],
    yieldG: 180, servings: [['1 vada', 45], ['2 vadas', 90]],
    confidence: 'low', note: 'Like every fried item here, the absorbed-oil figure is an estimate and it dominates the energy. 25 g for 80 g of dal is a reasonable middle.',
  },
  {
    id: 'uttapam', name: 'Uttapam', aliases: ['uthappam', 'onion uttapam', 'oothappam', 'uttapa'],
    region: 'South India', prominence: 50,
    summary: 'A thick dosa-batter pancake with onion and tomato pressed into it.',
    items: [['rice-white-raw', 100], ['urad-dal', 30], ['fenugreek-seed', 1], ['water', 200], ['onion', 40], ['tomato', 30], ['green-chilli', 4], ['coriander-leaves', 4], ['sunflower-oil', 10], ['salt', 3]],
    yieldG: 400, servings: [['1 uttapam', 130]],
    confidence: 'medium',
  },
  {
    id: 'coconut-chutney', name: 'Coconut chutney', aliases: ['thengai chutney', 'nariyal chutney', 'kobbari pachadi', 'white chutney'],
    region: 'South India', prominence: 60,
    summary: 'Fresh coconut ground with chilli and a little dal, tempered with mustard.',
    items: [['coconut-fresh', 80], ['chana-dal', 15], ['urad-dal', 2], ['green-chilli', 6], ['ginger', 4], ['tamarind-pulp', 4], ['water', 60], ['mustard-seed', 1], ['curry-leaves', 1], ['sunflower-oil', 4], ['salt', 2]],
    yieldG: 165, servings: [['1 tbsp', 15], ['2 tbsp', 30]],
    confidence: 'medium', note: 'Small servings and high energy density — two tablespoons alongside idli add more than the second idli does, which is the kind of thing a calorie count is actually useful for.',
  },
  {
    id: 'egg-curry', name: 'Egg curry', aliases: ['anda curry', 'egg masala', 'muttai kuzhambu', 'kodi guddu curry'],
    region: 'India', prominence: 65,
    summary: 'Boiled eggs simmered in an onion-tomato gravy.',
    items: [['egg-whole', 100, 'two eggs'], ['onion', 70], ['tomato', 80], ['sunflower-oil', 15], ['ginger', 5], ['garlic', 5], ['coriander-powder', 3], ['chilli-powder', 2], ['turmeric', 1], ['garam-masala', 2], ['salt', 3], ['water', 120]],
    yieldG: 360, servings: [['1 katori with 1 egg', 180]],
    confidence: 'medium',
  },
  {
    id: 'fish-curry', name: 'Fish curry', aliases: ['macher jhol', 'meen kuzhambu', 'chepala pulusu', 'fish gravy', 'machhi curry'],
    region: 'India', prominence: 65,
    summary: 'Fish poached in a tamarind and coconut gravy.',
    items: [['fish-rohu', 200], ['tamarind-pulp', 15], ['onion', 60], ['tomato', 60], ['coconut-fresh', 30], ['sesame-oil', 15], ['mustard-seed', 1], ['fenugreek-seed', 1], ['chilli-powder', 3], ['coriander-powder', 3], ['turmeric', 1.5], ['curry-leaves', 2], ['salt', 4], ['water', 250]],
    yieldG: 570, servings: [['1 katori', 180]],
    confidence: 'low', note: 'The fish row itself is medium-to-low confidence, so this dish cannot be better. Coastal versions use coconut milk instead of grated coconut and land noticeably higher.',
  },
  {
    id: 'mutton-curry', name: 'Mutton curry', aliases: ['mutton', 'goat curry', 'mutton masala', 'mamsam curry', 'lamb curry'],
    region: 'India', prominence: 70,
    summary: 'Goat meat slow-cooked in an onion-curd masala.',
    items: [['mutton', 250], ['onion', 100], ['tomato', 60], ['curd', 50], ['sunflower-oil', 20], ['ginger', 8], ['garlic', 8], ['coriander-powder', 4], ['chilli-powder', 3], ['turmeric', 2], ['garam-masala', 3], ['salt', 5], ['water', 250]],
    yieldG: 580, servings: [['1 katori', 180]],
    confidence: 'low', note: 'Built on the lean USDA goat figure. Indian mutton is sold bone-in with a good deal more fat on it, so a real plate is likely heavier than this says.',
  },
  {
    id: 'kadhi', name: 'Kadhi', aliases: ['kadi', 'besan kadhi', 'majjige huli', 'curd curry', 'punjabi kadhi'],
    region: 'India', prominence: 50,
    summary: 'Sour curd thickened with besan and simmered with a tempering.',
    items: [['curd', 200], ['besan', 25], ['water', 300], ['sunflower-oil', 10], ['mustard-seed', 1], ['cumin-seed', 1], ['fenugreek-seed', 0.5], ['turmeric', 1], ['curry-leaves', 2], ['green-chilli', 4], ['ginger', 3], ['salt', 3]],
    yieldG: 490, servings: [['1 katori', 160], ['1 bowl', 220]],
    confidence: 'medium',
  },
  {
    id: 'sabudana-khichdi', name: 'Sabudana khichdi', aliases: ['sago khichdi', 'javvarisi upma', 'sabudana', 'fasting khichdi'],
    region: 'Maharashtra', prominence: 45,
    summary: 'Soaked sago tossed with peanuts and potato — the standard fasting dish.',
    items: [['sabudana', 70], ['water', 70, 'absorbed while soaking'], ['groundnut', 25], ['potato', 60], ['ghee', 10], ['cumin-seed', 2], ['green-chilli', 5], ['lemon-juice', 8], ['sugar', 3], ['coriander-leaves', 4], ['salt', 2]],
    yieldG: 240, servings: [['1 plate', 240], ['1 katori', 130]],
    confidence: 'medium', note: 'Sago is almost pure starch and the peanuts are almost pure fat, which is why a fasting dish lands heavier than most full meals here.',
  },
  {
    id: 'pav-bhaji', name: 'Pav bhaji (bhaji only)', aliases: ['bhaji', 'pav bhaji', 'mumbai bhaji', 'vegetable mash'],
    region: 'Maharashtra', prominence: 65,
    summary: 'Mashed mixed vegetables cooked down with butter and pav bhaji masala. The pav is a separate item.',
    items: [['potato', 150], ['cauliflower', 60], ['green-peas', 40], ['capsicum', 40], ['onion', 60], ['tomato', 120], ['butter', 25], ['garam-masala', 4], ['chilli-powder', 3], ['turmeric', 1], ['ginger', 4], ['garlic', 5], ['salt', 4], ['coriander-leaves', 6], ['water', 80]],
    yieldG: 470, servings: [['1 plate of bhaji', 230]],
    confidence: 'low', note: 'The bhaji only — look up white bread for the pav and add two slices’ worth per pav. Street pav bhaji uses a great deal more butter than 25 g, often the same again on the griddled pav.',
  },
  {
    id: 'aloo-jeera', name: 'Jeera aloo', aliases: ['aloo jeera', 'cumin potato', 'jeera aloo sabzi', 'dry aloo'],
    region: 'North India', prominence: 45,
    summary: 'Boiled potato tossed in a cumin tempering. About the simplest sabzi there is.',
    items: [['potato', 250], ['sunflower-oil', 12], ['cumin-seed', 3], ['turmeric', 1], ['chilli-powder', 1], ['salt', 3], ['coriander-leaves', 4]],
    yieldG: 245, servings: [['1 katori', 130]],
    confidence: 'medium',
  },
]

function expand(seed: RecipeSeed): Recipe {
  return {
    id: seed.id,
    name: seed.name,
    aliases: seed.aliases,
    region: seed.region,
    summary: seed.summary,
    method: seed.method,
    items: seed.items.map(([ingredientId, grams, note]) => ({ ingredientId, grams, note })),
    yieldG: seed.yieldG,
    servings: seed.servings.map(([label, grams]) => ({ label, grams })),
    source: seed.source ?? 'derived',
    confidence: seed.confidence,
    sourceNote: seed.note,
    prominence: seed.prominence ?? 0,
  }
}

export const RECIPES: readonly Recipe[] = SEED.map(expand)
