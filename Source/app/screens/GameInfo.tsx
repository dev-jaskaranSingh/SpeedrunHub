import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  FlatList,
  Button,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-community/async-storage";
import { StatusBar } from "expo-status-bar";

import Run from "../components/Run";
import GameHeader from "../components/GameInfoComponents/GameHeader";

import { FontAwesome } from "@expo/vector-icons";
import { colors } from "../themes/theme";

export default function GameInfo(props) {
  const { id, abbreviation } = props.route.params;
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [game, setGame] = useState([]);
  const [url, setUrl] = useState("");
  const [runs, setRuns] = useState([]);
  const [variables, setVariables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [favourite, setFavourite] = useState(false);
  const [players, setPlayers] = useState([]);
  const [checked, setChecked] = useState(0);

  const _isFavourite = async (id) => {
    const gameList = JSON.parse(await AsyncStorage.getItem("@MyGames"));
    if (gameList != null) {
      for (let GAME of gameList) {
        if (GAME.id == id) {
          setFavourite(true);
        }
      }
    }
  };

  const _toggleFavourites = async () => {
    const games = await AsyncStorage.getItem("@MyGames");
    var gameList = JSON.parse(games);
    //Create game obj
    var game = {
      id: id,
      abbreviation: abbreviation,
    };
    if (gameList == null) {
      gameList = [];
    }
    if (favourite) {
      //add game to list
      gameList.push(game);
      //Game added to list
      await AsyncStorage.setItem("@MyGames", JSON.stringify(gameList));
      setFavourite(true);
    } else {
      //Game got removed from list
      for (let GAME of gameList) {
        if (game.id == GAME.id) {
          gameList.splice(gameList.indexOf(GAME), 1);
        }
      }
      await AsyncStorage.setItem("@MyGames", JSON.stringify(gameList));
      setFavourite(false);
    }
  };
  useEffect(() => {
    let mounted = true;
    if (mounted) {
      (async () => {
        //Load gameId & abbreviation from react navigation
        //Fav?
        _isFavourite(id);
        //Get Game Data
        //Fetch Categories from Speedrun.com
        const url =
          "https://www.speedrun.com/api/v1/games/" + id + "?embed=categories";
        const response = await fetch(url);
        const data = await response.json();
        //Categories output
        var outCategories = [];
        //Filter Categories (type == Per-Game)
        for (var category of data.data.categories.data) {
          if (category.type == "per-game") {
            outCategories.push(category);
          }
        }
        //Select Default Category
        const selectedCategory = outCategories[0].id;
        //Fetch Variables
        LoadVariables(selectedCategory);
        //Set State
        setLoading(false);
        setGame(data.data);
        setName(data.data.names.international);
        setCategories(outCategories);
        setChecked(selectedCategory);
      })();
    }
    return function cleanup() {
      mounted = false;
    };
  }, []);

  async function LoadVariables(categoryid) {
    try {
      setRuns([]);
      //Fetch Variables from Speedrun.com
      const variablesUrl =
        "https://www.speedrun.com/api/v1/categories/" +
        categoryid +
        "/variables?";
      const varResponse = await fetch(variablesUrl);
      const varData = await varResponse.json();
      //Get subcategories (is-subcategory===true)
      var outSubcategoies = [];
      //UrlBuild index
      var index = 1;
      //Url extension
      var urlExt =
        "https://www.speedrun.com/api/v1/leaderboards/" +
        id +
        "/category/" +
        categoryid;
      for (let subcategory of varData.data) {
        //Output Subcategory
        var outSubcategory = {
          id: "",
          name: "",
          values: [],
        };
        const str = subcategory["is-subcategory"];
        if (str == true) {
          //varData.data.is-subcategory == true
          //Load data into output
          outSubcategory.id = subcategory.id;
          outSubcategory.name = subcategory.name;
          //Get subcategory variables
          for (let variable in subcategory.values.values) {
            //Create output value
            var outValue = {
              label: "",
              id: "",
              rules: "",
              categoryid: "",
            };
            //Load outValue with data
            outValue.id = variable;
            outValue.label = subcategory.values.values[variable].label;
            outValue.rules = subcategory.values.values[variable].rules;
            outValue.categoryid = subcategory.id;
            //Load output to outSubcategory.values
            outSubcategory.values.push(outValue);
          }
          //Load subcategory into list
          outSubcategoies.push(outSubcategory);
          //Add url var
          urlExt = buildUrl(
            subcategory.id,
            subcategory.values.default,
            urlExt,
            index
          );
          //++ index
          index++;
        }
      }
      if (urlExt.includes("?")) {
        urlExt = urlExt + "&embed=players";
      } else {
        urlExt = urlExt + "?embed=players";
      }
      setVariables(outSubcategoies);
      setChecked(categoryid);
      LoadRuns(urlExt);
    } catch (error) {
      console.log(error);
    }
  }
  const buildUrl = (id, value, url, index) => {
    try {
      //index = number of values loaded on the url
      if (index == 1) {
        return url + "?" + "var-" + id + "=" + value;
      } else {
        return url + "&" + "var-" + id + "=" + value;
      }
    } catch (error) {
      console.log(error);
    }
  };
  const modifyUrl = (id, value) => {
    setRuns([]);
    var outUrl;
    //Url contains id
    //Id lenght
    var lenght = id.length;
    var i = url.search(id) + lenght + 1;
    //i = value first char position
    var start = url.substr(0, i);
    var end = url.substr(i, url.length);
    if (end.includes("&")) {
      end = end.substr(end.indexOf("&"), url.length);
      outUrl = start + value + end;
    } else {
      outUrl = start + value;
    }
    LoadRuns(outUrl);
  };
  async function LoadRuns(url) {
    try {
      //Fetch Runs from Speedrun.com
      const response = await fetch(url);
      const data = await response.json();
      setRuns(data.data.runs);
      setUrl(url);
      setPlayers(data.data.players.data);
    } catch (error) {
      console.log(error);
    }
  }
  const renderRun = ({ item, index }) => {
    try {
      const name =
        players[index].names.international != null
          ? players[index].names.international
          : "null";
      return (
        <Run
          place={item.place}
          runner={name}
          time={item.run.times.primary}
          abbreviation={abbreviation}
          categoryid={item.run.category}
          weblink={item.run.weblink}
        />
      );
    } catch (error) {}
  };
  const ListFooter = () => {
    return <View style={{ padding: 20 }}></View>;
  };
  const ListHeader = () => {
    return (
      <View>
        <GameHeader
          abbreviation={abbreviation}
          name={name}
          date={game["release-date"]}
          // platforms={game.platforms}
        >
          {favourite ? (
            <FontAwesome
              onPress={() => _toggleFavourites()}
              name="heart"
              color={colors.white}
              size={30}
              style={{ paddingRight: 20 }}
            />
          ) : (
            <FontAwesome
              onPress={() => _toggleFavourites()}
              name="heart-o"
              color={colors.white}
              size={30}
              style={{ paddingRight: 20 }}
            />
          )}
        </GameHeader>
        <View style={{ padding: 10 }}></View>
        <FlatList
          keyExtractor={(item) => item.id}
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View>
              {checked == item.id ? (
                <TouchableOpacity
                  style={styles.selectedcategorybuttoncontainer}
                  onPress={() => LoadVariables(item.id)}
                >
                  <View style={styles.selectedcategorybuttontext}>
                    <Text style={styles.selectedtext}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.categorybuttoncontainer}
                  onPress={() => LoadVariables(item.id)}
                >
                  <View style={styles.categorybuttontext}>
                    <Text style={styles.text}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}
        ></FlatList>
        <FlatList
          keyExtractor={(subcategory) => subcategory.id}
          data={variables}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <FlatList
              keyExtractor={(item) => item.id}
              data={item.values}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <View>
                  {url.includes(item.id) ? (
                    <View style={styles.button}>
                      <Button
                        title={item.label}
                        style={styles.button}
                        color={colors.primary}
                        onPress={() => modifyUrl(item.categoryid, item.id)}
                      />
                    </View>
                  ) : (
                    <View style={styles.button}>
                      <Button
                        title={item.label}
                        style={styles.button}
                        color={colors.darkgrey}
                        onPress={() => modifyUrl(item.categoryid, item.id)}
                      />
                    </View>
                  )}
                </View>
              )}
            ></FlatList>
          )}
        ></FlatList>
      </View>
    );
  };

  if (loading) {
    return (
      <ActivityIndicator
        style={{ alignSelf: "center", flex: 1 }}
        size="large"
        color={colors.primary}
      />
    );
  } else {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style={"light"}></StatusBar>
        <FlatList
          // getItemLayout={(data, index) => ({
          //   length: 50,
          //   offset: 10 * index,
          //   index,
          // })}
          keyExtractor={(item) => item.run.id}
          data={runs}
          renderItem={renderRun}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
        ></FlatList>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  profileBG: {
    flex: 1,
    resizeMode: "cover",
    backgroundColor: colors.black,
  },
  imagecontainer: {
    flex: 1,
    paddingTop: 30,
    alignContent: "center",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  //Category Button
  categorybuttoncontainer: {
    backgroundColor: colors.white,
    height: 46,
    marginVertical: 20,
    marginHorizontal: 10,
    shadowColor: colors.darkgrey,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.9,
    elevation: 2,
    justifyContent: "center",
    borderRadius: 10,
  },
  categorybuttontext: {
    paddingHorizontal: 10,
  },
  text: {
    color: colors.darkgrey,
    fontWeight: "bold",
    fontSize: 15,
  },
  //Selected Category Button
  selectedcategorybuttoncontainer: {
    backgroundColor: colors.white,
    height: 46,
    marginVertical: 20,
    marginHorizontal: 10,
    shadowColor: colors.darkgrey,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.9,
    elevation: 2,
    justifyContent: "center",
    borderRadius: 10,
  },
  selectedcategorybuttontext: {
    paddingHorizontal: 10,
  },
  selectedtext: {
    color: colors.primary,
    fontWeight: "bold",
    fontSize: 15,
  },
  button: {
    alignSelf: "center",
    height: 46,
    alignContent: "center",
    marginHorizontal: 10,
    marginVertical: 10,
  },
  buttontext: {
    flex: 1,
    backgroundColor: colors.white,
    alignContent: "center",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    textAlign: "center",
    color: colors.primary,
    fontWeight: "bold",
    fontSize: 15,
    borderRadius: 5,
    textAlignVertical: "center",
    paddingHorizontal: 20,
    shadowColor: colors.darkgrey,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.9,
    elevation: 2,
  },
});