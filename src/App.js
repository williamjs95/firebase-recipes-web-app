import { useState } from 'react';
import FirebaseAuthService from './FirebaseAuthService';
import LoginForm from './components/LoginForm';
import AddEditRecipeForm from './components/AddEditRecipeForm';

import './App.css';
import FirebaseFirestoreService from './FirebaseFirestoreService'

function App() {
  const [user, setUser] = useState(null);

  FirebaseAuthService.subscribeToAuthChanges(setUser);

  async function handleAddRecipe(newRecipe) {
    try {
      const response = await FirebaseFirestoreService.createDocument('recipes', newRecipe);

      // TODO: fetch the new recipe from firestore

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
