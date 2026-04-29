'use client';
import { Issue, Market, Reservation, Settings, Advertiser, FollowUpTask } from './models';
const KEY='localendar-db-v1';
const now=()=>new Date().toISOString();
const demo={markets:[{id:'m1',name:'Round Rock',city:'Round Rock',state:'TX',defaultDistributionCount:5000,active:true,createdAt:now(),updatedAt:now()}] as Market[],issues:[{id:'i1',marketId:'m1',month:7,year:2026,distributionCount:5000,printCost:1200,postageCost:900,otherCosts:300,status:'selling',frontPrice:600,backPrice:300}] as Issue[],reservations:[] as Reservation[],advertisers:[] as Advertiser[],followups:[] as FollowUpTask[],settings:{businessName:'LOCALendar Command Center',contactEmail:'hello@localendar.com',contactPhone:'(555) 123-4567',defaultFrontSpotPrice:600,defaultBackSpotPrice:300,defaultDistributionCount:5000,tradeCategories:['HVAC','Roofing','Plumbing','Electrical','Landscaping','Pest Control','Concrete','Windows','Doors','Garage Doors','Pool Service','Cleaning','Junk Removal','Foundation Repair','Remodeling','Painting','Power Washing','Tree Service','Lawn Care','Auto Detailing']} as Settings};
export type DB=typeof demo;
export function getDB():DB{if(typeof window==='undefined')return demo;const raw=localStorage.getItem(KEY);if(!raw){localStorage.setItem(KEY,JSON.stringify(demo));return demo;}return JSON.parse(raw)}
export function saveDB(db:DB){if(typeof window!=='undefined')localStorage.setItem(KEY,JSON.stringify(db))}
export const useSupabase=()=>Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
