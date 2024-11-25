// App.js
import { useEffect, useState, startTransition } from 'react'
import FirebaseAuthService from './FirebaseAuthService'
import LoginForm from './components/LoginForm'
import AddEditRecipeForm from './components/AddEditRecipeForm'

import './App.css'
import FirebaseFirestoreService from './FirebaseFirestoreService'

function App() {
  const [user, setUser] = useState(null)
  const [currentRecipe, setCurrentRecipe] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')

  // Set up Firebase Authentication subscription inside useEffect
  useEffect(() => {
    const unsubscribe = FirebaseAuthService.subscribeToAuthChanges(setUser)
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe() // Clean up subscription on unmount
      } else {
        console.error('unsubscribe is not a function')
      }
    }
  }, [])

  // Fetch recipes whenever user or categoryFilter changes
  useEffect(() => {
    setIsLoading(true)

    fetchRecipes()
      .then((fetchedRecipes) => {
        setRecipes(fetchedRecipes)
      })
      .catch((error) => {
        console.error('Error fetching recipes:', error.message)
        // Optionally, display an error message to the user
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [user, categoryFilter])

  // Function to fetch recipes based on current filters and user authentication
  async function fetchRecipes() {
    const queries = []

    if (categoryFilter) {
      queries.push({
        field: 'category',
        condition: '==',
        value: categoryFilter,
      })
    }

    if (!user) {
      queries.push({
        field: 'isPublished',
        condition: '==',
        value: true,
      })
    }

    try {
      const response = await FirebaseFirestoreService.readDocuments({
        collection: 'recipes',
        queries: queries,
      })

      const fetchedRecipes = response.docs.map((recipeDoc) => {
        const id = recipeDoc.id
        const data = recipeDoc.data()
        data.publishDate = new Date(data.publishDate.seconds * 1000)

        return { ...data, id }
      })

      return fetchedRecipes
    } catch (error) {
      console.error('Error reading documents:', error.message)
      throw error
    }
  }

  // Handler to refetch recipes
  async function handleFetchRecipes() {
    try {
      const fetchedRecipes = await fetchRecipes()
      setRecipes(fetchedRecipes)
    } catch (error) {
      console.error('Error fetching recipes:', error.message)
      // Optionally, display an error message to the user
    }
  }

  // Handler to add a new recipe
  async function handleAddRecipe(newRecipe) {
    try {
      const response = await FirebaseFirestoreService.createDocument('recipes', newRecipe)
      await handleFetchRecipes()

      alert(`Successfully created a recipe with an ID = ${response.id}`)
    } catch (error) {
      alert(`Error adding recipe: ${error.message}`)
    }
  }

  // Handler to update an existing recipe
  async function handleUpdateRecipe(newRecipe, recipeId) {
    try {
      await FirebaseFirestoreService.updateDocument('recipes', recipeId, newRecipe)
      await handleFetchRecipes()

      alert(`Successfully updated recipe with an ID = ${recipeId}`)
      setCurrentRecipe(null)
    } catch (error) {
      alert(`Error updating recipe: ${error.message}`)
      console.error('Error updating recipe:', error.message)
    }
  }

  // Handler to delete a recipe
  async function handleDeleteRecipe(recipeId) {
    const deleteConfirmation = window.confirm('Are you sure you want to delete this recipe?')

    if (deleteConfirmation) {
      try {
        await FirebaseFirestoreService.deleteDocument('recipes', recipeId)
        await handleFetchRecipes()

        setCurrentRecipe(null)
        window.scrollTo(0, 0)

        alert(`Successfully deleted a recipe with an ID = ${recipeId}`)
      } catch (error) {
        alert(`Error deleting recipe: ${error.message}`)
        console.error('Error deleting recipe:', error.message)
      }
    }
  }

  // Handler to initiate editing a recipe
  function handleEditRecipeClick(recipeId) {
    const selectedRecipe = recipes.find((recipe) => recipe.id === recipeId)

    if (selectedRecipe) {
      startTransition(() => {
        setCurrentRecipe(selectedRecipe)
      })
      window.scrollTo(0, document.body.scrollHeight)
    }
  }

  // Handler to cancel editing
  function handleEditRecipeCancel() {
    setCurrentRecipe(null)
  }

  // Utility function to get category label from key
  function lookupCategoryLabel(categoryKey) {
    const categories = {
      breadsSandwichesAndPizza: 'Breads, Sandwiches and Pizza',
      eggsAndBreakfast: 'Eggs & Breakfast',
      dessertsAndBakedGoods: 'Desserts & Baked Goods',
      fishAndSeafood: 'Fish & Seafood',
      vegetables: 'Vegetables',
    }

    return categories[categoryKey] || 'Unknown Category'
  }

  // Utility function to format date
  function formatDate(date) {
    const day = date.getUTCDate()
    const month = date.getUTCMonth() + 1
    const year = date.getUTCFullYear()
    const dateString = `${day}/${month}/${year}`

    return dateString
  }

  return (
    <div className="App">
      <div className="title-row">
        <h1 className="title">Firebase Recipes</h1>
        <LoginForm existingUser={user} />
      </div>
      <div className="main">
        <div className="row filters">
          <label className="recipe-label input-label">
            Category:
            <select
              value={categoryFilter}
              onChange={(e) => {
                try {
                  setCategoryFilter(e.target.value)
                } catch (error) {
                  console.error('Error setting category filter:', error)
                }
              }}
              className="select"
              required
            >
              <option value=""></option>
              <option value="breadsSandwichesAndPizza">Breads, Sandwiches and Pizza</option>
              <option value="eggsAndBreakfast">Eggs & Breakfast</option>
              <option value="dessertsAndBakedGoods">Desserts & Baked Goods</option>
              <option value="fishAndSeafood">Fish & Seafood</option>
              <option value="vegetables">Vegetables</option>
            </select>
          </label>
        </div>
        <div className="center">
          <div className="recipe-list-box">
            {isLoading && (
              <div className="fire">
                <div className="flames">
                  <div className="flame"></div>
                  <div className="flame"></div>
                  <div className="flame"></div>
                  <div className="flame"></div>
                </div>
                <div className="logs"></div>
              </div>
            )}
            {!isLoading && recipes.length === 0 && (
              <h5 className="no-recipes">No Recipes Found</h5>
            )}
            {!isLoading && recipes.length > 0 && (
              <div className="recipe-list">
                {recipes.map((recipe) => (
                  <div className="recipe-card" key={recipe.id}>
                    {!recipe.isPublished && <div className="unpublished">UNPUBLISHED</div>}
                    <div className="recipe-name">{recipe.name}</div>
                    <div className="recipe-field">
                      Category: {lookupCategoryLabel(recipe.category)}
                    </div>
                    <div className="recipe-field">
                      Publish Date: {formatDate(recipe.publishDate)}
                    </div>
                    {user && (
                      <button
                        type="button"
                        onClick={() => handleEditRecipeClick(recipe.id)}
                        className="primary-button edit-button"
                      >
                        EDIT
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <AddEditRecipeForm
          existingRecipe={currentRecipe}
          handleAddRecipe={handleAddRecipe}
          handleUpdateRecipe={handleUpdateRecipe}
          handleDeleteRecipe={handleDeleteRecipe}
          handleEditRecipeCancel={handleEditRecipeCancel}
        />
      </div>
    </div>
  )
}

export default App
