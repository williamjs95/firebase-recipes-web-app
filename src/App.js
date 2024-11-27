/* eslint-disable */
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
  const [orderBy, setOrderBy] = useState('publishDateDesc')
  const [recipesPerPage, setRecipesPerPage] = useState(3) 

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

  // Fetch recipes whenever user, categoryFilter, or orderBy changes
  useEffect(() => {
    // Reset recipes when filters change
    setRecipes([])
    handleFetchRecipes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, categoryFilter, orderBy, recipesPerPage])

  // Function to fetch recipes based on current filters and user authentication
  async function fetchRecipes(cursorId = '') {
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

    const orderByField = 'publishDate'
    let orderByDirection = 'desc' // Default to descending

    if (orderBy) {
      switch (orderBy) {
        case 'publishDateAsc':
          orderByDirection = 'asc'
          break
        case 'publishDateDesc':
          orderByDirection = 'desc'
          break
        default:
          console.warn(`Unknown orderBy value: ${orderBy}. Defaulting to 'desc'.`)
          orderByDirection = 'desc'
          break
      }
    }

    try {
      const response = await FirebaseFirestoreService.readDocuments({
        collection: 'recipes',
        queries: queries,
        orderByField: orderByField,
        orderByDirection: orderByDirection,
        perPage: recipesPerPage,
        cursorId: cursorId,
      })

      const newRecipes = response.docs.map((recipeDoc) => {
        const id = recipeDoc.id
        const data = recipeDoc.data()
        data.publishDate = new Date(data.publishDate.seconds * 1000)

        return { ...data, id }
      })

      return newRecipes
    } catch (error) {
      console.error('Error reading documents:', error.message)
      throw error
    }
  }

  // Handler to refetch recipes
  async function handleFetchRecipes(cursorId = '') {
    try {
      const fetchedRecipes = await fetchRecipes(cursorId)
      if (cursorId) {
        // Append new recipes
        setRecipes((prevRecipes) => [...prevRecipes, ...fetchedRecipes])
      } else {
        // Replace recipes (for initial load or when filters change)
        setRecipes(fetchedRecipes)
      }
    } catch (error) {
      console.error('Error fetching recipes:', error.message)
      // Optionally, display an error message to the user
    }
  }

  function handleRecipesPerPageChange(event) {
    const selectedValue = parseInt(event.target.value, 10) // Convert to number
    setRecipes([])
    setRecipesPerPage(selectedValue)
  }

  function handleLoadMoreRecipesClick() {
    const lastRecipe = recipes[recipes.length - 1]
    const cursorId = lastRecipe ? lastRecipe.id : ''
    handleFetchRecipes(cursorId)
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
          <label className="input-label">
            Order By:
            <select
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value)}
              className="select"
            >
              <option value="publishDateDesc">
                Publish Date (newest - oldest)
              </option>
              {/* Fixed Option Value */}
              <option value="publishDateAsc">
                Publish Date (oldest - newest)
              </option>
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
        {(recipes.length > 0) && (
          <>
            <label className="input-label">
              Recipes Per Page:
              <select
                value={recipesPerPage}
                onChange={handleRecipesPerPageChange}
                className="select"
              >
                <option value="3">3</option>
                <option value="6">6</option>
                <option value="9">9</option>
              </select>
            </label>
            <div className="pagination">
              <button
                type='button'
                onClick={handleLoadMoreRecipesClick}
                className="primary-button"
                disabled={isLoading} // Disable while loading
              >
                {isLoading ? 'Loading...' : 'LOAD MORE RECIPES'}
              </button>
            </div>
          </>
        )}
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
