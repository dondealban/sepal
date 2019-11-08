package org.openforis.sepal.component.processingrecipe.endpoint

import groovy.json.JsonSlurper
import groovymvc.Controller
import org.openforis.sepal.component.Component
import org.openforis.sepal.component.processingrecipe.api.Recipe
import org.openforis.sepal.component.processingrecipe.command.RemoveRecipe
import org.openforis.sepal.component.processingrecipe.command.SaveRecipe
import org.openforis.sepal.component.processingrecipe.query.ListRecipes
import org.openforis.sepal.component.processingrecipe.query.LoadRecipe
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import java.util.zip.InflaterInputStream

import static groovy.json.JsonOutput.toJson

class ProcessingRecipeEndpoint {
    private static final Logger LOG = LoggerFactory.getLogger(ProcessingRecipeEndpoint)
    private final Component component

    ProcessingRecipeEndpoint(Component component) {
        this.component = component
    }

    void registerWith(Controller controller) {
        controller.with {
            post('/processing-recipes/{id}') {
                def contents = new InflaterInputStream(request.inputStream).text
                component.submit(new SaveRecipe(new Recipe(
                        id: params.id,
                        name: params.name,
                        type: params.type,
                        username: sepalUser.username,
                        contents: contents
                )))
                send(recipesJson(sepalUser.username))
            }

            delete('/processing-recipes/{id}') {
                component.submit(new RemoveRecipe(params.id))
                send(recipesJson(sepalUser.username))
            }

            get('/processing-recipes/{id}') {
                def recipe = component.submit(new LoadRecipe(params.id))
                if (!recipe)
                    return halt(404)
                if (recipe.username != sepalUser.username && !sepalUser.admin) {
                    LOG.warn("User $sepalUser.username tries to load recipe from other user: $recipe")
                    return halt(404)
                }
                send(recipe.contents)
            }

            get('/processing-recipes') {
                send(recipesJson(sepalUser.username))
            }
        }
    }

    private String recipesJson(String username) {
        def recipes = component.submit(new ListRecipes(username))
        return toJson(recipes.collect {
            [
                    id          : it.id,
                    name        : it.name,
                    type        : it.type,
                    creationTime: it.creationTime,
                    updateTime  : it.updateTime
            ]
        })
    }

    private fromJson(String json) {
        new JsonSlurper().parseText(json)
    }
}
