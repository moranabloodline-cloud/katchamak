import type {HouseGenre} from './house-genres';

type Passage =
  | string
  | {heading:string}
  | {quote:string}
  | {stanza:string[]}
  | {steps:string[]}
  | {table:{columns:string[];rows:string[][]}}
  | {picture:string;alt:string;caption:string};

type GenreSample = {title:string;passages:Passage[]};

// Original editorial specimens. Only the Publish preview reads this catalog.
export const genreSamples:Record<HouseGenre,GenreSample> = {
  'Literary Fiction': {
    title:'A Place at the Table',
    passages:[
      'On Sundays my father set a place for the woman who had sold us the table. He did it without ceremony: the chipped plate, the short fork, the glass with a seam you could feel against your lip.',
      'I was thirty before I asked her name. By then the mark left by her glass was darker than the wood around it, and we had stopped putting a mat underneath.',
      'My father turned the empty plate a quarter turn. “I was hoping,” he said, “that you remembered.”'
    ]
  },
  Fantasy: {
    title:'The Orchard of Borrowed Names',
    passages:[
      'The queen’s true name grew on the highest branch. Tavi knew it by the taste of copper that filled her mouth as she climbed. Below her, the orchard keeper counted slowly to seven.',
      'On six she twisted the silver apple free. The bark shivered. Every tree in the valley bowed its crown, except the little plum beside her mother’s gate.',
      '“Put that back,” said the plum, in a voice she had spent eleven winters trying to remember.'
    ]
  },
  'Science Fiction': {
    title:'Thirteen Minutes of Morning',
    passages:[
      'Dawn reached the station thirteen minutes before its star rose. Inez checked the clocks against a pulsar, then checked the sun against the window. Only one of them could be repaired with a spanner.',
      {quote:'Telemetry, orbit 611. Light inbound. Source position: behind the observer.'},
      'She rolled the station through half a turn. The light turned with her. Someone had folded a morning into the hull, and the fold was opening.'
    ]
  },
  Mystery: {
    title:'The Dry Umbrella',
    passages:[
      'Six guests had crossed the courtyard in the downpour. Inspector Sen counted six dripping coats in the cloakroom and five wet umbrellas. The sixth, a green silk one, still carried a fine layer of dust.',
      '“The owner came by carriage,” the porter suggested.',
      'Sen looked through the glass door at the courtyard. A delivery boy was walking a bicycle along the only strip of paving the painters had left bare. “Tell me again,” she said, “how wide was that carriage?”'
    ]
  },
  Thriller: {
    title:'Platform Nine',
    passages:[
      'At 08:14 the arrivals board lost a train. Mara saw its number blink out. A moment later the rails under platform nine began to sing.',
      'She caught the porter’s eye across the crowd. He had heard it too. Beyond him, a school party in yellow coats stepped over the painted line.',
      'Her radio answered with her own voice, recorded yesterday. She dropped it, vaulted the barrier and pulled the station bell with both hands.'
    ]
  },
  Suspense: {
    title:'The Spare Key',
    passages:[
      'At the start of the week there were two cups on the draining board. By Thursday there were three. Ruth put the extra one in the highest cupboard and laid a hair across the handles.',
      'All evening she heard the building settle around her. At eleven the pipes knocked twice. At midnight the lift stopped one floor below.',
      'In the morning the hair was still in place. On her bedside table stood a warm cup of tea.'
    ]
  },
  Horror: {
    title:'The Room That Breathed',
    passages:[
      'Each night the paper roses on the nursery wall opened a little further. The landlord blamed the damp. He would not come upstairs to see.',
      'Mina stripped a corner of the paper. Beneath it the plaster was pink and warm. Something on the other side drew a slow breath, and the small room grew smaller by the width of her hand.',
      'Downstairs, through the floorboards, she heard the landlord counting.'
    ]
  },
  Romance: {
    title:'Reserved for Rain',
    passages:[
      'June’s bookshop had one leak and exactly one customer who chose to sit under it. Every rainy Saturday, Theo brought a different saucepan to catch the drops.',
      '“You could move your chair,” she said. “I could,” he agreed, spreading a map of the roof across the counter. In one corner he had pencilled two chairs beneath a blue awning.',
      'She looked at his drawing for a long time. Then she found a red pencil and drew a little table between them.'
    ]
  },
  Adventure: {
    title:'Across the Salt Cut',
    passages:[
      'At low tide the map promised a causeway. What the map omitted was the herd of seals asleep across it and the mist climbing the cliff behind us.',
      'Kit took off her boots. “Follow the limpets,” she said. Their pale rings marked the stones that stayed above water longest.',
      'Halfway across, the bell on the mainland began to ring. The seals slid into the sea, and under the last of them we saw an iron stair leading down.'
    ]
  },
  'Historical Fiction': {
    title:'The Compositor’s Dawn',
    passages:[
      'Vienna, 1907. Before the first tram rounded the corner, Klara had set the mayor’s speech twice. The first version filled a column. The second, delivered by a boy with snow in his cuffs, filled six lines.',
      'She laid the discarded lead letters in a tray. Her father had taught her to read them backwards by touch, a useful trick when the gas went out.',
      'At the bottom of the tray her finger found the one word the mayor had removed from both versions: bread.'
    ]
  },
  'Short Stories': {
    title:'One Button',
    passages:[
      'The tailor kept every button his customers left behind. When he retired, he poured the whole jar onto his counter and invited the town to find its coats.',
      'By noon people had paired a pearl with a christening dress and a brass anchor with a sailor who never came home. What remained was a small green button with a bite in it.',
      'The tailor put it in his pocket. He had been seven years old when his mother bought him that coat.'
    ]
  },
  Poetry: {
    title:'Low Water',
    passages:[
      {stanza:['The tide unbuttons the harbour,','one dark stone at a time.','A gull sets down its shadow','beside a length of twine.']},
      {stanza:['Under the pier, the mussels','keep their blue mouths closed.','The boat leans into its rope','as if to hear the shore.']},
      {stanza:['I turn a stone. Salt water','fills the hollow of my thumb.','All afternoon the sea returns','to take that small thing home.']}
    ]
  },
  Comics: {
    title:'The Last Tram',
    passages:[{picture:'last-tram',alt:'A four-panel color comic follows a bicycle courier returning a red scarf to a tram conductor.',caption:'“Next stop!” called the conductor. “One scarf!” called the cyclist.'}]
  },
  'Graphic Novels': {
    title:'The Night Window',
    passages:[{picture:'night-window',alt:'Three ink-wash panels follow a woman back into her family’s shuttered cinema, where dust catches the projector light.',caption:'I had forgotten how much of a room you could see in a single beam of light.'}]
  },
  "Children's Books": {
    title:'A Moon for Pip',
    passages:[{picture:'pocket-moon',alt:'Pip, a little mouse in a yellow coat, peers into a moonlit garden puddle.',caption:'Pip found the moon in a puddle. “There you are!”'}]
  },
  'Young Adult': {
    title:'The Backup Singer',
    passages:[
      'My first rule for surviving junior year was simple: hold a microphone only if it was unplugged. At the winter concert, Bea handed me hers and ran offstage to be sick.',
      'In the front row my little brother stopped filming his shoes. A hundred phone screens lit up. I knew our song in three keys and exactly zero ways to begin it alone.',
      'Then Bea knocked our count-in against the backstage door. Four small taps. I took a breath and came in on five.'
    ]
  },
  Biography: {
    title:'Ada Vale, Under Glass',
    passages:[
      'The earliest photograph of Ada Vale shows only her hands. They rest on the velvet edge of a museum case, one finger pointing out a hairline crack in a Roman bowl. The curator beside her is named on the back. Ada is not.',
      'In the years that followed she would piece together hundreds of vessels. To understand how she learned to see a whole pot in a tray of fragments, one must start in the kitchen behind her father’s china shop.',
      'It was there, among the chipped saucers, that Ada first signed a repair.'
    ]
  },
  Memoir: {
    title:'My Father’s Measuring Stick',
    passages:[
      'I brought the wrong thing home from my father’s workshop. My sister chose his planes. My brother took the bench. I took the strip of wood he used to prop the window open.',
      'At home, in better light, I saw that it was our old measuring stick. My height at eight was still there in green pencil. Beside it, in his square handwriting, were two words: shoes off.',
      'I set the stick against my kitchen door. For the first time in years I stood up as straight as I could.'
    ]
  },
  'Self-Help': {
    title:'A Smaller First Step',
    passages:[
      'Think of something you keep postponing. “Sort the photographs” sounds like an afternoon. “Find the first envelope” sounds like something you could do while the kettle boils.',
      {heading:'Try it on paper'},
      {steps:['Write the task as you usually describe it.','Circle the first action you could actually see someone take.','Give yourself permission to stop after that action.']},
      'What changed when you pictured the envelope instead of the entire box? Write one sentence while the answer is fresh.'
    ]
  },
  Business: {
    title:'The Queue at Counter Three',
    passages:[
      'At nine each morning the bakery had two queues. Customers waited for bread at the front. At the back, the bread waited for someone to print its labels.',
      {heading:'Find the handoff'},
      'For one shift, the team wrote down when each tray left the oven and when the first loaf reached the shelf. The oven was idle for four minutes. The trays spent forty minutes waiting.',
      {quote:'The first experiment cost one pencil: move the label sheet to the person who already knew which tray was next.'}
    ]
  },
  Investing: {
    title:'Reading a Return',
    passages:[
      'Two sample portfolios each begin with 100 units. Reading their closing balances tells only part of the story when money has moved into the account.',
      {table:{columns:['Example','Added','Closing balance'],rows:[['A','0','110'],['B','10','110']]}},
      'In A, the ten-unit increase came from the holdings. In B, a ten-unit deposit at the end explains the entire change. The balances match. The investment gains do not.'
    ]
  },
  Academic: {
    title:'Counting the Pauses',
    passages:[
      {heading:'Observation and unit of analysis'},
      'Consider a classroom exchange in which two speakers stop at the same moment. Measuring the resulting silence is straightforward. Assigning that silence to one speaker requires an explicit rule.',
      {heading:'Worked example'},
      'In a constructed transcript of twelve turns, three gaps exceed two seconds. A count by turn yields three observations. A count by speaker pair compresses all three into one case.',
      'This difference arises before a statistical model is chosen. A replicable account must therefore state both the timing threshold and the unit being counted.'
    ]
  }
};
