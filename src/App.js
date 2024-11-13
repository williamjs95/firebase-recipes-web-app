import { useEffect, useState } from 'react';
import FirebaseAuthService from './FirebaseAuthService';
import LoginForm from './components/LoginForm';
import AddEditRecipeForm from './components/AddEditRecipeForm';

import './App.css';
import FirebaseFirestoreService from './FirebaseFirestoreService'

function App() {
  const [user, setUser] = useState(null);
  const  [recipes, setRecipes] = useState([]);

  useEffect(() => {
    fetchRecipes()
      .then((fetchedRecipes) => {
        setRecipes(fetchedRecipes);
      })
      .catch((error) => {
        console.error(error.message)
        throw error;
      })
  }, [user])

  FirebaseAuthService.subscribeToAuthChanges(setUser);

  async function fetchRecipes() {
    let fetchedRecipes = [];

    try {
      const response = await FirebaseFirestoreService.readDocuments('recipes');

      const newRecipes = response.docs.map((recipeDoc) => {
        const id = recipeDoc.id;
        const data = recipeDoc.data();
        data.publishDate = new Date(data.publishDate.seconds * 1000);

        return { ...data, id };
      });
      fetchedRecipes = [...newRecipes];
    } catch (error) {
      console.error(error.message);
      throw error;
    }

    return fetchedRecipes;
  }

  async function handleFetchRecipes() {
    try {
      const fetchedRecipes = await fetchRecipes();

      setRecipes(fetchedRecipes);
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }

  async function handleAddRecipe(newRecipe) {
    try {
      const response = await FirebaseFirestoreService.createDocument('recipes', newRecipe);

      handleFetchRecipes();

      alert(`successfully create a recipe with an ID = ${response.id}`);
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="App">
      <div className='title-row'>
        <h1 className='title'>Firebase Recipes</h1>
        <LoginForm existingUser={user}></LoginForm>
      </div>
      <div className='main'>
        <AddEditRecipeForm handleAddRecipe={handleAddRecipe}/>      
      </div>
    </div>
  );
}

export default App;
