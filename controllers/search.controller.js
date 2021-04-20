var mongoose = require('mongoose');
var User = mongoose.model('users');

var config = require('dotenv').config();
var logger = require("../helpers/logger");
var responseHelper = require("../helpers/response.helper");
const constants = require("../constants");

var pageSize = parseInt(config.PAGE_SIZE);

//Lodash for data manipulation
const _ = require('lodash');

var selectUsersData = {
  user_fb_id: 1,
  full_name: 1,
  tags: 1,
  reviews_count: 1,
  rate: 1,
  rating: 1,
  profile_media_urls: 1,
  available: 1
};

var manipulateUsersResults = users => {
  for (let user of users) {
    if (user.profile_media_urls && user.profile_media_urls.length) {
      user.profile_image = user.profile_media_urls[0];
    }
    delete user.profile_media_urls;
    if (!user.profile_image) {
      user.profile_image = "";
    }
  }
}

var manipulateUserToNullArraysForAndroid = users => {
  for (let user of users) {
    if (user.tags.length <= 0) {
      user.tags = null;
    }
    if (user.profile_media_urls.length <= 0) {
      user.profile_media_urls = null;
    }
  }
}

var getUsersSearchQuery = (user_token, body, find, tab, blocked = []) => {

  var query = {};

  if (find) {
    switch (tab) {
      case "top":
        query['$and'] = [
          { _id: { $ne: mongoose.Types.ObjectId(user_token.d), $nin: blocked } },
          {
            '$or': [
              { full_name: new RegExp(find, "i") },
              { tags: new RegExp(find, "i") },
              { bio: new RegExp(find, "i") },
              { user_code: find.toUpperCase()},
            ]
          }
        ]
        break;
      case "people":
        query['$and'] = [
          { _id: { $ne: mongoose.Types.ObjectId(user_token.d), $nin: blocked } },
          {
            '$or': [
              { full_name: new RegExp(find, "i") },
              { bio: new RegExp(find, "i") },
              { user_code: find.toUpperCase()},
            ]
          }
        ]
        break;
    }
  }
  else
  {
    query['_id'] = { $ne: mongoose.Types.ObjectId(user_token.d), $nin: blocked};
  }

  // Filters
  if (body.rating) {
    body.rating = parseFloat(body.rating);
    query["rating"] = { $gt: body.rating };
  }
  if (body.minRate) {
    body.minRate = parseFloat(body.minRate);
    query["rate"] = { $gte: body.minRate };
  }
  if (body.maxRate) {
    body.maxRate = parseFloat(body.maxRate);
    if (query.rate) {
      query["rate"]['$lte'] = body.maxRate;
    } else {
      query["rate"] = { $lte: body.maxRate };
    }
  }

  if (body.availableNow === 1) {
      query.available = 1;
  }
  else if (body.availableNow === 0)
  {
      query.available = 0;
  }
  return query;
}

var getSearchSorting = (body, tab) => {
  // Sorting
  var sorting = {};

  if (body.sortReviews === 1 || body.sortReviews === -1) {
    sorting.reviews_count = body.sortReviews;
  }
  if (body.sortRating === 1 || body.sortRating === -1) {
    sorting.rating = body.sortRating;
  }

  // In top tab, users will be sorted based on descending rating by ignoring filters
  // if (tab === "top") {
  //   sorting = { rating: -1 };
  // }

  if(Object.keys(sorting).length === 0) {
    sorting.created_at = -1;
  }
  return sorting;
}

var getTagsAggregateArray = (find, skip, limit, user_token, blocked = []) => [
  { $match: { user_code: { $ne : user_token.c}, _id: { $nin : blocked } } },
  { $project: { tags: 1, full_name: 1 } },
  { $unwind: "$tags" },
  { $match: { tags: new RegExp(find, "i") } },
  {
    $group: {
      _id: "$tags",
      total: { $sum: 1 }
    }
  },
  { $sort: { total: -1 } },
  {
    $group: {
      _id: null,
      count: { $sum: 1 },
      results: { $push: "$$ROOT" }
    }
  },
  {
    $project: {
      count: 1,
      results: { $slice: ["$results", skip, limit] }
    }
  }
];

var getTagCountAgainstProfiles = (find, user_token, blocked = []) => [
  { $match: { user_code: { $ne : user_token.c}, _id : { $nin : blocked } } },
  { $project: { tags: 1, full_name: 1 } },
  { $unwind: "$tags" },
  { $match: { tags: find } },
  {
    $group: {
      _id: "$tags",
      total: { $sum: 1 }
    }
  }
];

var usersByTag = async (req, res) => {
  try {
    var userId = req.token_decoded.d;

    var page = req.query.page ? parseInt(req.query.page) : 1;
    var skip = (page - 1) * pageSize;
    var query = { tags: req.params.tag || "" };

    var blockedusers = await User.findOne({_id: userId}, {blocked: 1, _id: 0})

    var blocked = blockedusers.blocked.map(block => block.user)

    if (query.tags) {
      await lastSearchHelper.saveLastSearch(
        req.token_decoded.d,
        constants.lastSearch.tag,
        query.tags
      );
    }
    query['_id'] = { $ne: req.token_decoded.d, $nin: blocked };

    var responses = await Promise.all([
      User.find(query, selectUsersData)
        .sort({ rating: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      User.count(query)
    ]);

    var users = responses[0];
    var total = responses[1];

    // manipulateUsersResults(users);

    manipulateUserToNullArraysForAndroid(users);

    responseHelper.success(
      res,
      { users, total, page, totalPages: Math.ceil(total / pageSize), pageSize },
      "Users fetched by tags successfully"
    );
  } catch (err) {
    logger.error(err);
    responseHelper.systemfailure(res, err);
  }
}

var search = async (req, res) => {
  try {
    var userId = req.token_decoded.d;

    var page = req.query.page ? parseInt(req.query.page) : 1;
    var skip = (page - 1) * pageSize;
    var body = req.body;
    var user_token = req.token_decoded;
    var find = req.query.find || "";
    let isFilterOn=['rating','sortRating','sortReviews','maxRate','minRate'].some(filter=>filter in body);

    var blockedusers = await User.findOne({_id: userId}, {blocked: 1, _id: 0})

    var blocked = blockedusers.blocked.map(block => block.user)

    // Tabs
    var tab = body.tab;
    var possibleTabValues = ["top", "people", "tags"];
    if (!possibleTabValues.includes(tab)) {
      return responseHelper.badRequest(
        res,
        "Value of tab is invalid, possible values are: " + possibleTabValues.toString()
      );
    }

    if (tab === 'tags') {
      if (!find) {
        // if nothing searched then return last searched tags in tags tab
        var tags = await LastSearch
          .find({ userId, target: constants.lastSearch.tag }, { searchedTag: 1 })
          .sort({ searchedAt: -1 })
          .limit(constants.lastSearch.limit).lean();

        var tagsResult = [];
        for (let tag of tags) {
          let countUsers = await User.aggregate(getTagCountAgainstProfiles(tag.searchedTag, user_token, blocked));
          let total_count = countUsers && countUsers.length ? countUsers[0].total : 0;
          tagsResult.push({ _id: tag.searchedTag,  total: total_count});
        }

        var suggestedPeople = await User.aggregate(
          [
            { $project : constants.selectUsersData },
            { $unwind: "$tags" },
            { $sample: { size: 5 } }
          ]
        )

        var tagsSuggested = [];
        for (let suggestion of suggestedPeople) {
          let countUsers = await User.aggregate(getTagCountAgainstProfiles(suggestion.tags, user_token, blocked));
          let total_count = countUsers && countUsers.length ? countUsers[0].total : 0;
          tagsSuggested.push({ _id: suggestion.tags,  total: total_count});
        }

        uniqueTagsSuggested = _.uniqWith(tagsSuggested, _.isEqual)

        return responseHelper.success(
          res,
          { tags: tagsResult, suggested: uniqueTagsSuggested },
          `Last ${constants.lastSearch.limit} searched tags fetched successfully`
        );
      }

      var tagsResult = await User.aggregate(getTagsAggregateArray(find, skip, pageSize, user_token, blocked));
      tagsResult = tagsResult && tagsResult.length ? tagsResult[0] : {};
      var total = tagsResult.count;
      return responseHelper.success(
        res,
        { tags: tagsResult.results, count: total, page, totalPages: Math.ceil(total / pageSize), pageSize },
        "Search results fetched successfully"
      );

    } else {

      if (tab === 'people' && !find && !isFilterOn) {
        // if nothing searched then return last searched users in people tab
        var users = await LastSearch
          .find({ userId, target: constants.lastSearch.user, searchedUser: { $nin : blocked } }, { searchedUser: 1 })
          .sort({ searchedAt: -1 })
          .limit(constants.lastSearch.limit)
          .populate("searchedUser", constants.selectUsersData)
          .lean();

        var usersResult = [];
        for (let user of users) { usersResult.push(user.searchedUser); }

        var suggested = await User.aggregate(
          [
            { $match: getUsersSearchQuery(user_token, body, find, tab, blocked) },
            { $project : constants.selectUsersData },
            { $sample: { size: 5 } },
            { $sort: getSearchSorting(body, tab) }
          ]
        );

        return responseHelper.success(
          res,
          { users: usersResult, suggested: suggested },
          `Last ${constants.lastSearch.limit} searched users fetched successfully`
        );
      }

      // if search is empty in top tab then return the whole search history of the user
      if (tab === 'top' && !find && !isFilterOn) {
        var searchHistory = await LastSearch
          .find({ userId, searchedUser : { $nin : blocked} }, { searchedUser: 1, target: 1, searchedTag: 1 })
          .sort({ searchedAt: -1 })
          .limit(constants.lastSearch.limit)
          .populate("searchedUser", constants.selectUsersData)
          .lean();

        var topHistoryResult = [];
        for (let history of searchHistory)
        {
          if(history.target == constants.lastSearch.tag)
          {
            let countUsers = await User.aggregate(getTagCountAgainstProfiles(history.searchedTag, blocked));
            let total_count = countUsers && countUsers.length ? countUsers[0].total : 0;
            topHistoryResult.push({ _id: history.searchedTag,  total: total_count, is_user: false});
          }
          else
          {
            if(history.searchedUser)
            {
              history.searchedUser.is_user = true;
              topHistoryResult.push(history.searchedUser);
            }
          }
        }
        // console.log(getUsersSearchQuery(user_token, body, find, tab, blocked));
        var suggested = await User.aggregate(
           [
            { $match: getUsersSearchQuery(user_token, body, find, tab, blocked) },
            { $project : constants.selectUsersData },
            { $sample: { size: 5 } },
            { $sort: getSearchSorting(body, tab) }
           ]
        )


        return responseHelper.success(
          res,
          { users: topHistoryResult, suggested: suggested },
          `Last ${constants.lastSearch.limit} searched users fetched successfully`
        );
      }

      // search for user's user_code code
      // if (find && find.length === 6) {
      //   var referrerUser = await User.findOne({ user_code: find });
      //   if (referrerUser) {
      //     return responseHelper.success(
      //       res,
      //       { users: [referrerUser] },
      //       `User against user_code: ${find} fetched successfully`
      //     );
      //   }
      // }

      // handle for "people" and "top" tabs
      var query = getUsersSearchQuery(user_token, body, find, tab, blocked);
      var sorting = getSearchSorting(body, tab);
      console.log(query);
      var responses = await Promise.all([
        User.find(query, selectUsersData)
          .sort(sorting)
          .skip(skip)
          .limit(pageSize)
          .lean(),
        User.count(query)
      ])

      var users = responses[0];
      var total = responses[1];

      // manipulateUsersResults(users);
      manipulateUserToNullArraysForAndroid(users);

      responseHelper.success(
        res,
        { users, total, page, totalPages: Math.ceil(total / pageSize), pageSize },
        "Search results fetched successfully"
      );
    }
  } catch (err) {
    logger.error(err);
    responseHelper.systemfailure(res, err);
  }
};

module.exports = {
  search,
  usersByTag,
};
