/**
 * Grams per cup, keyed by `ingredientKey` from lib/ingredient-names.ts.
 *
 * GENERATED from USDA FoodData Central by scripts/build-weight-table.ts, then reviewed by hand.
 * Edit entries directly — correcting one here corrects every recipe that uses the ingredient.
 * The comment on each line is how often the library uses it and which USDA record it came from.
 *
 * Ingredients that are always weighed or always counted are deliberately absent: they need no
 * conversion. An ingredient missing from this table simply shows no weight.
 *
 * 419 entries, covering 2690 ingredient uses.
 */
export const GRAMS_PER_CUP: Readonly<Record<string, number>> = {
  "garlic": 136, // 196× · Garlic, raw
  "ground black pepper": 110.4, // 107× · Spices, pepper, black
  "all purpose flour": 125, // 80× · Wheat flour, white, all-purpose, enriched, bleached
  "olive oil": 216, // 72× · Oil, olive, salad or cooking
  "salt": 292, // 67× · Salt, table
  "water": 237, // 64× · Beverages, water, tap, drinking
  "carrot": 110, // 48× · Carrots, raw
  "table salt": 292, // 48× · Salt, table
  "cilantro": 16, // 47× · Coriander (cilantro) leaves, raw
  "pepper": 110.4, // 43× · Spices, pepper, black
  "parsley": 60, // 43× · Parsley, fresh
  "onion": 160, // 41× · Onions, raw
  "ground cumin": 96, // 41× · Spices, cumin seed
  "black pepper": 110.4, // 41× · Spices, pepper, black
  "vanilla extract": 208, // 40× · Vanilla extract
  "chicken broth": 249, // 36× · Soup, chicken broth, ready-to-serve
  "scallion": 100, // 35× · Onions, spring or scallions (includes tops and bulb), raw
  "garlic powder": 155.2, // 35× · Spices, garlic powder
  "vegetable oil": 218, // 34× · Oil, vegetable, soybean, refined
  "lemon juice": 244, // 32× · Lemon juice, raw
  "dried oregano": 48, // 32× · Spices, oregano, dried
  "red pepper flake": 84.8, // 32× · Spices, pepper, red or cayenne
  "baking soda": 220.8, // 29× · Leavening agents, baking soda
  "sugar": 200, // 28× · Sugars, granulated
  "salted butter": 227, // 28× · Butter, salted
  "baking powder": 220.8, // 28× · Leavening agents, baking powder, double-acting, straight phosphate
  "light brown sugar": 220, // 26× · Sugars, brown
  "granulated sugar": 200, // 26× · Sugars, granulated
  "basil": 24, // 26× · Basil, fresh
  "ginger": 96, // 25× · Ginger root, raw
  "smoked paprika": 108.8, // 23× · Spices, paprika
  "dry white wine": 235.2, // 22× · Alcoholic beverage, wine, table, white
  "tomato": 242, // 22× · Tomatoes, crushed, canned
  "thyme": 38.4, // 21× · Thyme, fresh
  "honey": 339, // 21× · Honey
  "celery": 101, // 20× · Celery, raw
  "cane sugar": 200, // 20× · Sugars, granulated
  "soy sauce": 255, // 19× · Soy sauce made from soy and wheat (shoyu)
  "chili powder": 128, // 19× · Spices, chili powder
  "tomato paste": 264, // 18× · Tomato products, canned, paste, without salt added (Includes foods for USDA's Food Distribution Program)
  "shallot": 160, // 17× · Shallots, raw
  "cayenne pepper": 84.8, // 17× · Spices, pepper, red or cayenne
  "paprika": 108.8, // 16× · Spices, paprika
  "rosemary": 27.2, // 16× · Rosemary, fresh
  "dried thyme": 68.8, // 16× · Spices, thyme, dried
  "cornstarch": 128, // 15× · Cornstarch
  "toasted sesame oil": 218, // 15× · Oil, sesame, salad or cooking
  "onion powder": 110.4, // 15× · Spices, onion powder
  "butter": 227, // 15× · Butter, without salt
  "chicken stock": 240, // 14× · Soup, stock, chicken, home-prepared
  "sour cream": 230, // 14× · Cream, sour, cultured
  "red bell pepper": 92, // 14× · Peppers, sweet, red, raw
  "neutral oil": 218, // 13× · Oil, canola
  "powdered sugar": 100, // 13× · Sugars, powdered
  "low sodium chicken broth": 240, // 13× · Soup, chicken broth, low sodium, canned
  "lime juice": 242, // 13× · Lime juice, raw
  "worcestershire sauce": 275, // 12× · Sauce, worcestershire
  "ground cinnamon": 124.8, // 11× · Spices, cinnamon, ground
  "dark brown sugar": 220, // 11× · Sugars, brown
  "dill": 8.9, // 11× · Dill weed, fresh
  "flat leaf parsley": 60, // 10× · Parsley, fresh
  "canola oil": 218, // 10× · Oil, canola
  "feta cheese": 150, // 10× · Cheese, feta
  "ground turmeric": 150.4, // 9× · Spices, turmeric, ground
  "corn": 166, // 9× · Corn grain, yellow
  "chives": 48, // 9× · Chives, raw
  "fennel seed": 92.8, // 9× · Spices, fennel seed
  "sesame seed": 144, // 9× · Seeds, sesame seeds, whole, dried
  "panko bread crumb": 108, // 9× · Bread, crumbs, dry, grated, plain
  "cold water": 237, // 9× · Beverages, water, tap, drinking
  "ground coriander": 80, // 8× · Spices, coriander seed
  "white onion": 160, // 8× · Onions, raw
  "mozzarella cheese": 86, // 8× · Cheese, mozzarella, low moisture, part-skim, shredded
  "leek": 89, // 8× · Leeks, (bulb and lower leaf-portion), raw
  "dried basil": 33.6, // 8× · Spices, basil, dried
  "zucchini": 124, // 8× · Squash, summer, zucchini, includes skin, raw
  "sweet paprika": 108.8, // 7× · Spices, paprika
  "cinnamon": 124.8, // 7× · Spices, cinnamon, ground
  "peanut oil": 216, // 7× · Oil, peanut, salad or cooking
  "mayonnaise": 220, // 7× · Salad dressing, mayonnaise, regular
  "squeezed lemon juice": 244, // 7× · Lemon juice, raw
  "low sodium soy sauce": 255, // 7× · Soy sauce made from soy and wheat (shoyu), low sodium
  "apple cider vinegar": 239, // 7× · Vinegar, cider
  "pure vanilla extract": 208, // 7× · Vanilla extract
  "buttermilk": 245, // 7× · Milk, buttermilk, fluid, cultured, lowfat
  "green bell pepper": 149, // 7× · Peppers, sweet, green, raw
  "balsamic vinegar": 255, // 7× · Vinegar, balsamic
  "red pepper": 92, // 6× · Peppers, sweet, red, raw
  "ground nutmeg": 112, // 6× · Spices, nutmeg, ground
  "butternut squash": 140, // 6× · Squash, winter, butternut, raw
  "broccoli floret": 71, // 6× · Broccoli, flower clusters, raw
  "red wine vinegar": 239, // 5× · Vinegar, red wine
  "brown sugar": 220, // 5× · Sugars, brown
  "ketchup": 240, // 5× · Catsup
  "maple syrup": 315, // 5× · Syrups, maple
  "sesame oil": 218, // 5× · Oil, sesame, salad or cooking
  "long grain white rice": 158, // 5× · Rice, white, long-grain, regular, enriched, cooked
  "high heat oil": 218, // 5× · Oil, sunflower, high oleic (70% and over)
  "monterey jack cheese": 132, // 5× · Cheese, monterey
  "whole milk ricotta cheese": 248, // 5× · Cheese, ricotta, whole milk
  "half and half": 242, // 5× · Cream, fluid, half and half
  "raisin": 165, // 4× · Raisins, seeded
  "reduced sodium soy sauce": 255, // 4× · Soy sauce made from soy and wheat (shoyu), low sodium
  "clove": 104, // 4× · Spices, cloves, ground
  "sugar snap pea": 63, // 4× · Peas, edible-podded, raw
  "semisweet chocolate chip": 173, // 4× · Candies, semisweet chocolate
  "dried rosemary": 52.8, // 4× · Spices, rosemary, dried
  "beef broth": 240, // 4× · Soup, beef broth or bouillon canned, ready-to-serve
  "arugula": 20, // 4× · Arugula, raw
  "cumin seed": 96, // 4× · Spices, cumin seed
  "cotija cheese": 120, // 4× · Cheese, mexican, queso cotija
  "chicken broth or water": 241, // 4× · Soup, chicken broth or bouillon, dry, prepared with water
  "hoisin sauce": 256, // 4× · Sauce, hoisin, ready-to-serve
  "plain whole milk yogurt": 245, // 4× · Yogurt, plain, whole milk
  "low sodium chicken stock": 240, // 4× · Soup, chicken broth, low sodium, canned
  "corn kernel": 164, // 4× · Corn, sweet, yellow, canned, whole kernel, drained solids
  "whole chicken broth": 249, // 4× · Soup, chicken broth, ready-to-serve
  "tabasco sauce": 225.6, // 3× · Sauce, ready-to-serve, pepper, TABASCO
  "orzo pasta": 64, // 3× · Pasta, dry, enriched
  "allspice": 96, // 3× · Spices, allspice, ground
  "dried tarragon": 28.8, // 3× · Spices, tarragon, dried
  "pecan": 109, // 3× · Nuts, pecans
  "white chocolate chip": 170, // 3× · Candies, white chocolate
  "sun dried tomato": 54, // 3× · Tomatoes, sun-dried
  "oil sun dried tomato": 110, // 3× · Tomatoes, sun-dried, packed in oil, drained
  "radish": 116, // 3× · Radishes, raw
  "heavy cream or half and half": 242, // 3× · Cream, fluid, half and half
  "or frozen corn kernel": 165, // 3× · Corn, sweet, white, frozen, kernels cut off cob, unprepared
  "homemade roasted vegetable broth or store bought low sodium vegetable broth": 221, // 3× · Soup, vegetable broth, ready to serve
  "cracked black pepper": 110.4, // 3× · Spices, pepper, black
  "ground ginger": 83.2, // 3× · Spices, ginger, ground
  "dried cranberry": 160, // 3× · Cranberries, dried, sweetened (Includes foods for USDA's Food Distribution Program)
  "asian fish sauce": 288, // 3× · Sauce, fish, ready-to-serve
  "israeli couscous": 173, // 3× · Couscous, dry
  "frozen corn kernel": 165, // 3× · Corn, sweet, white, frozen, kernels cut off cob, unprepared
  "parmesan": 100, // 3× · Cheese, parmesan, grated
  "blueberry": 155, // 3× · Blueberries, frozen, unsweetened (Includes foods for USDA's Food Distribution Program)
  "ricotta cheese": 248, // 3× · Cheese, ricotta, whole milk
  "couscous": 173, // 3× · Couscous, dry
  "cumin": 96, // 3× · Spices, cumin seed
  "kale": 21, // 3× · Kale, raw
  "pomegranate seed": 174, // 3× · Pomegranates, raw
  "oil": 218, // 3× · Oil, canola
  "grapeseed or other neutral oil": 218, // 3× · Oil, grapeseed
  "hot sauce": 230.4, // 3× · Sauce, ready-to-serve, pepper or hot
  "white sugar": 200, // 3× · Sugars, granulated
  "tamari or low sodium soy sauce": 288, // 3× · Soy sauce made from soy (tamari)
  "reduced sodium chicken broth": 240, // 3× · Soup, chicken broth, less/reduced sodium, ready to serve
  "warm water": 237, // 3× · Beverages, water, tap, drinking
  "red wine": 235.2, // 3× · Alcoholic beverage, wine, table, red
  "dry red wine": 235.2, // 3× · Alcoholic beverage, wine, table, red
  "shelled pistachio": 123, // 2× · Nuts, pistachio nuts, raw
  "oat flour": 104, // 2× · Oat flour, partially debranned
  "avocado oil": 218, // 2× · Oil, avocado
  "shaoxing wine": 232, // 2× · Alcoholic beverage, wine, cooking
  "dark soy sauce": 255, // 2× · Soy sauce made from soy and wheat (shoyu)
  "oyster sauce": 288, // 2× · Sauce, oyster, ready-to-serve
  "peanut": 218, // 2× · Oil, soybean, salad or cooking
  "white pepper": 113.6, // 2× · Spices, pepper, white
  "sriracha": 312, // 2× · Sauce, hot chile, sriracha
  "milk chocolate": 168, // 2× · Candies, milk chocolate
  "pearl couscous": 173, // 2× · Couscous, dry
  "bread crumb": 108, // 2× · Bread, crumbs, dry, grated, plain
  "snow pea": 63, // 2× · Peas, edible-podded, raw
  "clear vanilla extract": 208, // 2× · Vanilla extract
  "canned tomato sauce": 245, // 2× · Tomato products, canned, sauce
  "demerara sugar": 202, // 2× · Sugar, turbinado
  "chili flake": 128, // 2× · Spices, chili powder
  "simple ricotta or store bought ricotta": 248, // 2× · Cheese, ricotta, whole milk
  "ground allspice": 96, // 2× · Spices, allspice, ground
  "pea": 145, // 2× · Peas, green, raw
  "whole milk or half and half": 242, // 2× · Cream, fluid, half and half
  "vegetable broth": 221, // 2× · Soup, vegetable broth, ready to serve
  "strong brewed coffee": 237, // 2× · Beverages, coffee, brewed, prepared with tap water
  "sake": 232.8, // 2× · Alcoholic beverage, rice (sake)
  "neutral vegetable oil": 218, // 2× · Oil, vegetable, soybean, refined
  "dried parsley": 25.6, // 2× · Spices, parsley, dried
  "king arthur unbleached cake flour": 137, // 2× · Wheat flour, white, cake, enriched
  "lawry s seasoned salt": 292, // 2× · Salt, table
  "calabrian chily": 128, // 2× · Spices, chili powder
  "unbleached all purpose flour": 125, // 2× · Wheat flour, white, all-purpose, enriched, unbleached
  "nutmeg": 112, // 2× · Spices, nutmeg, ground
  "white wine": 235.2, // 2× · Alcoholic beverage, wine, table, white
  "fine grind bulgur": 140, // 2× · Bulgur, dry
  "lettuce": 72, // 2× · Lettuce, iceberg (includes crisphead types), raw
  "white chocolate": 170, // 2× · Candies, white chocolate
  "beef stock": 240, // 2× · Soup, stock, beef, home-prepared
  "barbecue sauce": 279, // 2× · Sauce, barbecue
  "sun dried tomato in oil": 110, // 2× · Tomatoes, sun-dried, packed in oil, drained
  "taco seasoning": 136.8, // 2× · Seasoning mix, dry, taco, original
  "cold salted butter": 227, // 2× · Butter, salted
  "hot honey": 339, // 2× · Honey
  "long grain rice": 185, // 2× · Rice, white, long-grain, regular, raw, enriched
  "chicken or vegetable stock": 240, // 2× · Soup, stock, chicken, home-prepared
  "pickled sushi ginger": 200, // 2× · Ginger root, pickled, canned, with artificial sweetener
  "turmeric": 150.4, // 2× · Spices, turmeric, ground
  "cider vinegar": 239, // 2× · Vinegar, cider
  "green chili": 139, // 2× · Peppers, chili, green, canned
  "ice water": 237, // 2× · Beverages, water, tap, drinking
  "rosemary or teaspoon dried": 27.2, // 1× · Rosemary, fresh
  "white vinegar": 238, // 1× · Vinegar, distilled
  "green pepper": 149, // 1× · Peppers, sweet, green, raw
  "ground": 104, // 1× · Spices, cloves, ground
  "yellow mustard": 249, // 1× · Mustard, prepared, yellow
  "or 1 teaspoon dried rosemary or dried rosemary": 27.2, // 1× · Rosemary, fresh
  "vodka": 222.4, // 1× · Alcoholic beverage, distilled, vodka, 80 proof
  "avocado oil or vegan butter": 218, // 1× · Oil, avocado
  "runny almond butter": 250, // 1× · Nuts, almond butter, plain, without salt added
  "light soy sauce or shoyu": 255, // 1× · Soy sauce made from soy and wheat (shoyu)
  "light soy sauce": 255, // 1× · Soy sauce made from soy and wheat (shoyu)
  "light miso": 275, // 1× · Miso
  "white sesame seed": 144, // 1× · Seeds, sesame seeds, whole, dried
  "poppy seed": 140.8, // 1× · Spices, poppy seed
  "runny honey": 339, // 1× · Honey
  "tamari": 288, // 1× · Soy sauce made from soy (tamari)
  "microplaned carrot": 110, // 1× · Carrots, raw
  "dried mint": 25.6, // 1× · Spearmint, dried
  "ground paprika": 108.8, // 1× · Spices, paprika
  "parsley and mint": 60, // 1× · Parsley, fresh
  "cardamom": 92.8, // 1× · Spices, cardamom
  "olive oil or unsalted butter": 216, // 1× · Oil, olive, salad or cooking
  "beef broth or stock": 240, // 1× · Soup, beef broth or bouillon canned, ready-to-serve
  "cooked long grain white rice": 158, // 1× · Rice, white, long-grain, regular, enriched, cooked
  "unseasoned bread crumb": 108, // 1× · Bread, crumbs, dry, grated, plain
  "jarred banana pepper ring": 124, // 1× · Pepper, banana, raw
  "mineral or filtered water": 237, // 1× · Water, bottled, generic
  "ground cumin seed": 96, // 1× · Spices, cumin seed
  "cayenne": 84.8, // 1× · Spices, pepper, red or cayenne
  "beef or chicken broth": 249, // 1× · Soup, chicken broth, ready-to-serve
  "walnut": 80, // 1× · Nuts, walnuts, english
  "sweetened condensed milk": 306, // 1× · Milk, canned, condensed, sweetened
  "dried dill": 49.6, // 1× · Spices, dill weed, dried
  "peanut butter": 258, // 1× · Peanut butter, chunk style, with salt
  "lard or unsalted butter": 205, // 1× · Lard
  "slivered almond": 143, // 1× · Nuts, almonds
  "snipped dill weed": 8.9, // 1× · Dill weed, fresh
  "vegetable or chicken stock": 240, // 1× · Soup, stock, chicken, home-prepared
  "cooked sushi rice": 205, // 1× · Rice, white, short-grain, cooked, unenriched
  "smooth peanut butter": 258, // 1× · Peanut Butter, smooth (Includes foods for USDA's Food Distribution Program)
  "maple or agave syrup": 315, // 1× · Syrups, maple
  "unbleached white flour": 125, // 1× · Wheat flour, white, all-purpose, enriched, unbleached
  "canned or tomato": 240, // 1× · Tomatoes, red, ripe, canned, packed in tomato juice
  "beef or chicken stock or a combination of stock and water": 240, // 1× · Soup, stock, chicken, home-prepared
  "unrefined salt": 292, // 1× · Salt, table
  "seafood stock or chicken broth": 240, // 1× · Soup, stock, chicken, home-prepared
  "sweet rice flour or all purpose flour": 125, // 1× · Wheat flour, white, all-purpose, enriched, unbleached
  "vermicelli": 140, // 1× · Vermicelli, made from soy
  "store bought pesto": 248, // 1× · Sauce, pesto, CLASSICO, basil pesto, ready-to-serve
  "neutral cooking oil": 218, // 1× · Oil, soybean, salad or cooking
  "squash": 140, // 1× · Squash, winter, butternut, raw
  "uncooked white rice": 200, // 1× · Rice, white, short-grain, enriched, uncooked
  "sun dried tomato in olive oil": 110, // 1× · Tomatoes, sun-dried, packed in oil, drained
  "yellow cornmeal": 122, // 1× · Cornmeal, whole-grain, yellow
  "white whole wheat flour or all purpose flour": 125, // 1× · Wheat flour, white, all-purpose, enriched, bleached
  "uncooked wild and brown rice blend": 160, // 1× · Wild rice, raw
  "raw pecan or walnut": 109, // 1× · Nuts, pecans
  "vanilla": 208, // 1× · Vanilla extract
  "cocoa powder": 86, // 1× · Cocoa, dry powder, unsweetened
  "light corn syrup": 341, // 1× · Syrups, corn, light
  "fine cornmeal": 157, // 1× · Cornmeal, degermed, enriched, yellow
  "dry whole wheat miniature pasta": 96, // 1× · Pasta, whole-wheat, dry (Includes foods for USDA's Food Distribution Program)
  "low sodium chicken or vegetable stock": 240, // 1× · Soup, chicken broth, low sodium, canned
  "light miso paste": 275, // 1× · Miso
  "uncooked white or yellow stone ground grits": 156, // 1× · Cereals, corn grits, yellow, regular and quick, unenriched, dry
  "mexican blend cheese or cheddar cheese": 112, // 1× · Cheese, Mexican blend
  "butter or margarine": 227, // 1× · Margarine-like, margarine-butter blend, soybean oil and butter
  "leek or onion": 89, // 1× · Leeks, (bulb and lower leaf-portion), raw
  "brown lentil": 192, // 1× · Lentils, raw
  "spinach firmly": 30, // 1× · Spinach, raw
  "cooked white or brown rice": 186, // 1× · Rice, white, medium-grain, cooked, unenriched
  "low fat cottage cheese or part skim ricotta cheese": 248, // 1× · Cheese, ricotta, part skim milk
  "part skim mozzarella cheese": 86, // 1× · Cheese, mozzarella, low moisture, part-skim, shredded
  "prewashed white quinoa": 170, // 1× · Quinoa, uncooked
  "garlic hummus": 246, // 1× · Hummus, commercial
  "loosely basil": 24, // 1× · Basil, fresh
  "cold butter": 227, // 1× · Butter, salted
  "or frozen and thawed corn": 141, // 1× · Corn, yellow, whole kernel, frozen, microwaved
  "cilantro or parsley": 60, // 1× · Parsley, fresh
  "filtered water": 237, // 1× · Water, bottled, generic
  "dried thyme or oregano": 68.8, // 1× · Spices, thyme, dried
  "pecorino or parmesan cheese": 100, // 1× · Cheese, parmesan, grated
  "macaroni": 84, // 1× · Macaroni, vegetable, enriched, dry
  "white miso": 275, // 1× · Miso
  "quick cooking grits": 156, // 1× · Cereals, corn grits, white, regular and quick, enriched, dry
  "unsalted chicken stock": 240, // 1× · Soup, stock, chicken, home-prepared
  "long grain brown rice or brown and wild rice blend": 185, // 1× · Rice, brown, long-grain, raw (Includes foods for USDA's Food Distribution Program)
  "jarred tomatillo salsa": 240, // 1× · Sauce, salsa, verde, ready-to-serve
  "fenugreek seed": 177.6, // 1× · Spices, fenugreek seed
  "dried marjoram": 27.2, // 1× · Spices, marjoram, dried
  "dried dill weed": 49.6, // 1× · Spices, dill weed, dried
  "italian parsley": 60, // 1× · Parsley, fresh
  "dill weed": 8.9, // 1× · Dill weed, fresh
  "lime zest plus cup juice": 242, // 1× · Lime juice, raw
  "coconut oil": 218, // 1× · Oil, coconut
  "cooked chicken breast": 140, // 1× · Chicken, broilers or fryers, breast, meat only, cooked, roasted
  "reduced sodium chicken broth or water": 240, // 1× · Soup, chicken broth, less/reduced sodium, ready to serve
  "bouquet garni seasoning or dried oregano": 48, // 1× · Spices, oregano, dried
  "pineapple juice": 250, // 1× · Pineapple juice, canned or bottled, unsweetened, without added ascorbic acid
  "uncooked arborio rice": 200, // 1× · Rice, white, short-grain, enriched, uncooked
  "cream of tartar": 144, // 1× · Leavening agents, cream of tartar
  "short grain sushi rice": 200, // 1× · Rice, white, short-grain, enriched, uncooked
  "granulated white sugar": 200, // 1× · Sugars, granulated
  "duck fat or light olive oil": 216, // 1× · Oil, olive, salad or cooking
  "loosely kale": 21, // 1× · Kale, raw
  "saffron thread": 33.6, // 1× · Spices, saffron
  "pitted date": 147, // 1× · Dates, deglet noor
  "zest plus 6 tablespoon juice lemon zest plus lemon juice": 244, // 1× · Lemon juice, raw
  "chinese light soy sauce": 255, // 1× · Soy sauce made from soy and wheat (shoyu)
  "chinese chives or scallion": 48, // 1× · Chives, raw
  "prepared yellow mustard": 249, // 1× · Mustard, prepared, yellow
  "cake flour": 137, // 1× · Wheat flour, white, cake, enriched
  "pure maple syrup": 315, // 1× · Syrups, maple
  "whole chicken broth or low sodium store bought chicken broth": 249, // 1× · Soup, chicken broth, ready-to-serve
  "cheddar cheese or mexican cheese blend": 112, // 1× · Cheese, Mexican blend
  "or teaspoon oregano or dried oregano": 48, // 1× · Spices, oregano, dried
  "or frozen pea": 160, // 1× · Peas, green, frozen, cooked, boiled, drained, without salt
  "slivered basil": 24, // 1× · Basil, fresh
  "provolone cheese": 132, // 1× · Cheese, provolone
  "old fashioned grits": 156, // 1× · Cereals, corn grits, white, regular and quick, enriched, dry
  "canola or neutral oil": 218, // 1× · Oil, canola
  "chicken or veggie broth": 249, // 1× · Soup, chicken broth, ready-to-serve
  "caraway seed": 107.2, // 1× · Spices, caraway seed
  "uncooked pearled barley": 200, // 1× · Barley, pearled, raw
  "high quality apricot preserve or jam": 320, // 1× · Jams and preserves, apricot
  "billion island dressing or store bought thousand island or russian dressing": 250, // 1× · Salad dressing, thousand island, commercial, regular
  "mild salsa": 259, // 1× · Sauce, salsa, ready-to-serve
  "leave": 38.4, // 1× · Thyme, fresh
  "apricot jam": 320, // 1× · Jams and preserves, apricot
  "sriracha sauce": 312, // 1× · Sauce, hot chile, sriracha
  "less sodium soy sauce": 255, // 1× · Soy sauce made from soy and wheat (shoyu), low sodium
  "quinoa": 170, // 1× · Quinoa, uncooked
  "short grain rice": 200, // 1× · Rice, white, short-grain, enriched, uncooked
  "beef broth or chicken broth": 96, // 1× · Soup, chicken broth or bouillon, dry
  "evaporated milk": 252, // 1× · Milk, canned, evaporated, with added vitamin A
  "mexican cheese blend": 112, // 1× · Cheese, Mexican blend
  "apricot preserve": 320, // 1× · Jams and preserves, apricot
  "ground cayenne pepper": 84.8, // 1× · Spices, pepper, red or cayenne
  "unsalted": 146, // 1× · Peanuts, all types, dry-roasted, without salt
  "agave syrup": 220, // 1× · Sweetener, syrup, agave
  "snipped italian parsley": 60, // 1× · Parsley, fresh
  "shelled english pea or frozen pea": 145, // 1× · Peas, green, raw
  "dry white wine or stock": 235.2, // 1× · Alcoholic beverage, wine, table, white
  "parsley leave and tender stem": 60, // 1× · Parsley, fresh
  "cream": 240, // 1× · Cream, fluid, light (coffee cream or table cream)
  "milk chocolate chip": 168, // 1× · Candies, milk chocolate
  "sushi or glutinous rice": 185, // 1× · Rice, white, glutinous, unenriched, uncooked
  "palm sugar or light brown sugar": 220, // 1× · Sugars, brown
  "buttermilk or natural yogurt": 245, // 1× · Milk, buttermilk, fluid, cultured, lowfat
  "collard greens": 36, // 1× · Collards, raw
  "matzo meal": 115, // 1× · Cracker, meal
  "frozen corn": 165, // 1× · Corn, sweet, white, frozen, kernels cut off cob, unprepared
  "toasted pumpkin seed": 118, // 1× · Seeds, pumpkin and squash seed kernels, roasted, without salt
  "dried rosemary or 1 tablespoon": 52.8, // 1× · Spices, rosemary, dried
  "soy sauce or tamari": 288, // 1× · Soy sauce made from soy (tamari)
  "curry powder": 100.8, // 1× · Spices, curry powder
  "chicken bouillon paste": 96, // 1× · Soup, chicken broth or bouillon, dry
  "seagram s 7 american blended whiskey": 336, // 1× · Alcoholic beverage, distilled, whiskey, 86 proof
  "parsley or dill": 60, // 1× · Parsley, fresh
  "jalape o cilantro lime sauce": 242, // 1× · Lime juice, raw
  "low sodium chicken broth or water": 240, // 1× · Soup, chicken broth, low sodium, canned
  "spanish smoked paprika": 108.8, // 1× · Spices, paprika
  "chicken broth or stock": 240, // 1× · Soup, stock, chicken, home-prepared
  "thyme or 1 teaspoon dried": 68.8, // 1× · Spices, thyme, dried
  "sweet hungarian paprika": 108.8, // 1× · Spices, paprika
  "toasted and ground caraway seed": 107.2, // 1× · Spices, caraway seed
  "beef or chicken stock": 240, // 1× · Soup, stock, chicken, home-prepared
  "dried apricot": 130, // 1× · Apricots, dried, sulfured, uncooked
  "summer savory": 70.4, // 1× · Spices, savory, ground
  "safflower or grapeseed oil": 218, // 1× · Oil, safflower, salad or cooking, high oleic (primary safflower oil of commerce)
  "plus 2 teaspoon powdered sugar": 100, // 1× · Sugars, powdered
  "1 milk": 244, // 1× · Milk, lowfat, fluid, 1% milkfat, with added vitamin A and vitamin D
  "uncooked glutinous white rice": 185, // 1× · Rice, white, glutinous, unenriched, uncooked
  "dry quinoa": 170, // 1× · Quinoa, uncooked
  "pitted dried date": 147, // 1× · Dates, deglet noor
  "hot chicken stock": 240, // 1× · Soup, stock, chicken, home-prepared
  "frozen shelled edamame": 118, // 1× · Edamame, frozen, unprepared
  "black peppercorn": 110.4, // 1× · Spices, pepper, black
  "dried bread crumb": 108, // 1× · Bread, crumbs, dry, grated, plain
  "toasted pine nut": 135, // 1× · Nuts, pine nuts, dried
  "spinach or regular spinach": 30, // 1× · Spinach, raw
  "caramel sauce": 328, // 1× · Toppings, butterscotch or caramel
  "seasoned panko bread crumb": 120, // 1× · Bread, crumbs, dry, grated, seasoned
  "colored sugar": 200, // 1× · Sugars, granulated
  "mexican blend cheese": 112, // 1× · Cheese, Mexican blend
  "soy sauce blend": 255, // 1× · Soy sauce made from soy and wheat (shoyu)
  "lard": 205, // 1× · Lard
  "rubbed sage": 32, // 1× · Spices, sage, ground
  "unsweetened almond milk or nonfat milk": 262, // 1× · Beverages, almond milk, unsweetened, shelf stable
  "grapeseed or neutral oil": 218, // 1× · Oil, grapeseed
  "zest plus 1 tablespoon juice from 1 lemon": 244, // 1× · Lemon juice, raw
  "white or yellow miso": 275, // 1× · Miso
  "ground fenugreek": 177.6, // 1× · Spices, fenugreek seed
  "walnut or pecan": 80, // 1× · Nuts, walnuts, english
  "italian seasoned bread crumb": 120, // 1× · Bread, crumbs, dry, grated, seasoned
  "unsweetened applesauce": 244, // 1× · Applesauce, canned, unsweetened, with added ascorbic acid
  "fig preserve": 320, // 1× · Jams and preserves
  "vegetable or canola oil": 218, // 1× · Oil, canola
  "sake or dry sherry": 232.8, // 1× · Alcoholic beverage, rice (sake)
  "cornstarch or all purpose flour": 128, // 1× · Cornstarch
  "chicken or ham broth": 96, // 1× · Soup, chicken broth or bouillon, dry
  "garlic paste": 136, // 1× · Garlic, raw
  "paprika or tsp ground cayenne pepper": 108.8, // 1× · Spices, paprika
  "seasoned bread crumb": 120, // 1× · Bread, crumbs, dry, grated, seasoned
  "parsley or cilantro": 60, // 1× · Parsley, fresh
  "pearled barley": 200, // 1× · Barley, pearled, raw
  "red miso": 275, // 1× · Miso
  "bean sprout": 104, // 1× · Mung beans, mature seeds, sprouted, raw
  "grind cornmeal": 157, // 1× · Cornmeal, degermed, enriched, yellow
  "cooked chickpea": 164, // 1× · Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, with salt
  "tomato puree": 250, // 1× · Tomato products, canned, puree, with salt added
  "chicken or vegetable broth": 221, // 1× · Soup, vegetable broth, ready to serve
  "raw pistachio": 123, // 1× · Nuts, pistachio nuts, raw
  "flavor extract": 208, // 1× · Vanilla extract
  "light lager": 236, // 1× · Alcoholic beverage, beer, light
  "sweet rice wine": 235.4, // 1× · Alcoholic beverage, wine, dessert, sweet
  "or more if needed warm water": 237, // 1× · Beverages, water, tap, drinking
  "marsala wine": 235.4, // 1× · Alcoholic beverage, wine, dessert, sweet
  "dry white wine such as pinot grigio": 235.2, // 1× · Alcoholic beverage, wine, table, white, Pinot Gris (Grigio)
  "sherry wine": 235.4, // 1× · Alcoholic beverage, wine, dessert, sweet
}
