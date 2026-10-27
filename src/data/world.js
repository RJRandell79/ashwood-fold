// Ported from the v5 prototype by tools/port-v5.mjs.


export const TPD=144, W=40, H=26, SPEED=3.5, SAVEKEY='ashworth-fold-v1', SEASON_DAYS=5, YEAR_DAYS=20, MAXPOP=26;
export const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export const SEASONS=['Spring','Summer','Autumn','Winter'];
export const LIGHT=[[6,20],[5,21.5],[6.5,19.5],[7.5,17.5]];
export const FARM=[.45,.9,2.2,0];
export const P={
  holt:{name:'Holt Cottage',x:3,y:3,w:4,h:3,indoor:true,home:true},
  pendle:{name:'Pendle Cottage',x:9,y:3,w:4,h:3,indoor:true,home:true},
  barrow:{name:'Barrow Cottage',x:3,y:9,w:4,h:3,indoor:true,home:true},
  fair:{name:'Fairclough Farmhouse',x:29,y:3,w:4,h:3,indoor:true,home:true},
  calder:{name:'Calder Cottage',x:34,y:3,w:4,h:3,indoor:true,home:true},
  greaves:{name:'Greaves House',x:34,y:9,w:4,h:3,indoor:true,home:true},
  plot1:{name:'Market Row Cottage',x:19,y:20.6,w:4,h:3,indoor:true,home:true,plot:true},
  plot2:{name:'Lane End Cottage',x:.2,y:14.2,w:2.5,h:3,indoor:true,home:true,plot:true},
  tavern:{name:'The Plough',x:16,y:3,w:6,h:4,indoor:true},
  bakery:{name:'the Bakehouse',x:24,y:4,w:4,h:3,indoor:true},
  hall:{name:'the Moot Hall',x:28,y:8,w:4,h:3,indoor:true},
  square:{name:'the Green',x:16,y:10,w:8,h:6,indoor:false},
  forge:{name:'the Forge',x:10,y:9,w:4,h:3,indoor:true},
  weaving:{name:'the Weaving Shed',x:26,y:12,w:5,h:4,indoor:true},
  chapel:{name:'the Chapel',x:3,y:14,w:4,h:4,indoor:true},
  garden:{name:'the Physic Garden',x:9,y:15,w:5,h:3,indoor:false},
  market:{name:'the Market Cross',x:16,y:17,w:6,h:3,indoor:false},
  mill:{name:'the Watermill',x:3,y:19,w:5,h:4,indoor:true},
  fields:{name:'the South Fields',x:24,y:18,w:12,h:5,indoor:false},
  wharf:{name:'the Canal Wharf',x:12.8,y:.9,w:4,h:2.1,indoor:false,tech:'canal'},
  school:{name:'the School',x:33,y:14,w:4,h:3,indoor:true,tech:'school'},
  cottonmill:{name:'the Cotton Mill',x:11.5,y:20.2,w:6,h:3.4,indoor:true,tech:'cottonmill'}
};
export const BARN={x:36.4,y:18,w:3.3,h:4.2};
export const JOBS={baker:'bakery',miller:'mill',labourer:'mill',weaver:'weaving',smith:'forge',farmhand:'fields',farmer:'fields',herbalist:'garden',reeve:'hall',carter:'market',innkeeper:'tavern',pedlar:'market',millhand:'cottonmill',navvy:'wharf',child:null};
export const ESSENTIAL=['baker','miller','smith','innkeeper','reeve','herbalist'];
export const HUES={holt:12,pendle:208,barrow:36,fair:128,calder:285,greaves:172,tavern:52,plot1:240,plot2:95,stranger:330};
