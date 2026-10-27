// Ported from the v5 prototype by tools/port-v5.mjs.


export const TECH={
  plough:{name:'Heavy plough',what:'turns the clay deeper so the South Fields yield more',jobs:['farmer','farmhand','smith'],need:5,cost:30,req:[],hint:'Talk of thin harvests'},
  millstone:{name:'Second millstone',what:'lets the Watermill grind twice the corn',jobs:['miller','labourer','smith'],need:5,cost:35,req:[],hint:'Grumbling about bare shelves'},
  barn:{name:'Tithe barn',what:'keeps a whole harvest dry through the winter',jobs:['farmer','reeve','carter'],need:6,cost:45,req:[],hint:'Worry about where to store the corn'},
  shuttle:{name:'Flying shuttle',what:'lets one weaver do the work of two',jobs:['weaver','smith'],need:3,cost:16,req:[],hint:'The cloth merchant wants more cloth'},
  school:{name:'Village school',what:'teaches the children their letters, and the village to question idle talk',jobs:['herbalist','reeve','innkeeper'],need:6,cost:40,req:[],hint:'Concern about idle talk and idle children'},
  canal:{name:'Canal',what:'links the valley to the towns, bringing coal and corn by boat',jobs:['carter','reeve','miller','smith'],need:9,cost:140,req:['cottonmill'],hint:'Talk of a canal cut through the next valley',build:10,navvies:3},
  steam:{name:'Steam engine',what:'drives the cotton mill with coal instead of the river',jobs:['smith','millhand','miller'],need:7,cost:120,req:['canal'],hint:'The mill wants more power than the river gives',build:3},
  railway:{name:'Railway',what:'puts Ashwood Fold an hour from Manchester',jobs:['reeve','smith','carter','miller'],need:10,cost:180,req:['steam'],hint:'Surveyors have been seen on the fells',build:10,navvies:4},
  cottonmill:{name:'Cotton mill',what:'spins thread by water power down by the river',jobs:['miller','weaver','smith'],need:8,cost:90,req:['shuttle','millstone'],hint:'Talk of the new mills in the next valley'}
};
