const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const mongoose = require("mongoose");
const dotenv =require('dotenv');
const Listing = require("./model/Listing");


dotenv.config({path: './.env'});


///Setup env login
async function connectToMongoDB() {
    await mongoose.connect(
        process.env.DB,
        {useNewUrlParser:true}
        );
    console.log("connected to mongodb");
}


const scrapingResults = [
    {
        title: 'Data Analyst for Real Estate Company',
        datePosted: new Date("2020-12-02 15:47"),
        neighborhood: '(financial district)',
        url: 'https://sfbay.craigslist.org/sfc/sof/d/san-francisco-data-analyst-for-real/7240736215.html',
        jobDescription: 
        "Ballast Investments (the “Company”) is seeking a Data Analyst to support our Records Management Administrator and Asset Management Team...",
        compensation: "DOE (Please submit salary requirements with application)"

    }
];


////:The scraping function 
// 1 get the url
// 2 scrap what we need
async function scrapeListings(page) {
    await page.goto(
        "https://sfbay.craigslist.org/search/sfc/sof"
    );
    const html = await page.content();
    const $ = cheerio.load(html);
    
    ///by getting the css class, we fetch the needed data
    const listings = $(".result-info")
        .map((index, element) =>  {
            const titleElement = $(element).find(".result-title");
            const timeElement = $(element).find(".result-date");
            const hoodElement = $(element).find(".result-hood")

            const title = $(titleElement).text();
            const url = $(titleElement).attr("href");
            const datePosted = new Date($(timeElement).attr("datetime"));  
            return {title, url, datePosted};
            })
        .get();
        return listings;
};



async function scrapeJobDescriptions(listings, page) {
    for(var i = 0; i < listings.length; i ++) {
        await page.goto(listings[i].url);
        const html = await page.content();
        const $ = cheerio.load(html);
        const jobDescription = $("#postingbody").text();
        const compensation = $("p.attrgroup > span:nth-child(1) > b").text();

        listings[i].jobDescription = jobDescription;
        listings[i].compensation =  compensation;

        console.log(listings[i].jobDescription);
        console.log(listings[i].compensation);

        const listingModel = new Listing(listings[i]);
        await listingModel.save();

        await sleep(1000);
    }
}

async function sleep(miliseconds) {
    return new Promise(resolve => setTimeout(resolve, miliseconds))
}


async function main() {
    await connectToMongoDB();
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const listings = await scrapeListings(page);
    const listingsWithJobDescriptions = await scrapeJobDescriptions(
        listings, 
        page
    );
    console.log(listings);
}


main();