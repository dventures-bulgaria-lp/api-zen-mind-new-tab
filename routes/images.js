const {
  UNSPLASH_DEFAULT_APP_ID,
  REDIS_TIME_EXP,
  UNSPLASH_PHOTO_CATEGORIES,
  UNSPLASH_APP_SBNT_ID
} = require("../config");

const axios = require("axios");

const sourceTypeMap = {
    sbnt: UNSPLASH_APP_SBNT_ID,
    default: UNSPLASH_DEFAULT_APP_ID
}

module.exports = (app, redis_client) => {
  //Middleware Function to Check Cache
  const checkCache = (req, res, next) => {
    let { page, sourceType } = req.query;
    if (!sourceType) {
        sourceType = 'default';
      }
    const redisIndex = `${sourceType}&page=${page}`;

    redis_client.get(redisIndex, (err, data) => {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      }
      //if no match found
      if (data != null) {
        res.send(JSON.parse(data));
      } else {
        //proceed to next middleware function
        next();
      }
    });
  };

  app.get("/get-unsplash-images", checkCache, async (req, res) => {
    try {
      let { page, sourceType } = req.query;
    
      if (!sourceType) {
        sourceType = 'default';
      }

      const clientId = sourceTypeMap[sourceType];

      const images = await axios.get(
        `https://api.unsplash.com/search/photos/?page=${page}&per_page=30&query=${UNSPLASH_PHOTO_CATEGORIES}&client_id=${clientId}&orientation=landscape`
      );

      //get data from response
      const imagesData = images.data;
      const redisIndex = `${sourceType}&page=${page}`;
      //add data to Redis
      redis_client.setex(redisIndex, REDIS_TIME_EXP, JSON.stringify(imagesData));

      return res.json(imagesData);
    } catch (error) {
      console.log(error);
      return res.status(500).json(error);
    }
  });
};
