import { world, system, Player } from '@minecraft/server'
import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui'
import Database from './Database.js'
import ChatCommand from './ChatHanlder.js';

ChatCommand({
    command: 'leaderboard',
    alias: ['l'],
    callback: (player) => {
        player.sendMessage('§aOpening LeaderBoard Admin Menu...')
        system.run(() => MainMenu(player))
    }
})

function MainMenu(player) {
    new ActionFormData()
        .title('§6LeaderBoard Admin Menu')
        .body('§aPlease Select An Option From Below')
        .button('§aCreate LeaderBoard', 'textures/ui/icon_recipe_item')
        .button('§aRemove LeaderBoard', 'textures/ui/cancel')
        .button('§aEdit LeaderBoard', 'textures/ui/confirm')
        .button('§cClose', 'textures/ui/cancel')
        .show(player).then(({ canceled, selection, cancelationReason }) => {
            if (cancelationReason === "UserBusy") return MainMenu(player)
            if (canceled) return;
            switch (selection) {
                case 0: CreateLeaderBoard(player); break;
                case 1: RemoveLeaderBoard(player); break;
                case 2: EditLeaderBoard(player); break;
                case 3: player.sendMessage(`§aClosing Menu...`); break;
            }
        })
}

/**
 * @param {Player} player
*/
function CreateLeaderBoard(player) {
    new ModalFormData()
        .title('§aCreate LeaderBoard')
        .textField('§9ScoreBoard Name', 'Enter ScoreBoard Name Here')
        .textField('§9LeaderBoard Name', 'Enter LeaderBoard Name Here')
        .slider('§9LeaderBoard Max Users', 1, 10, 1, 10)
        .toggle('§cAre you sure you want to create this LeaderBoard and set the Leader location to your current location?', false)
        .show(player).then(({ canceled, formValues: [ScoreBoardName, LeaderBoardName, MaxUsers, Confirm] }) => {
            if (canceled) return;
            if (!Confirm) return player.sendMessage('§cYou must confirm to create this LeaderBoard.')
            if (!world.scoreboard.getObjective(ScoreBoardName))
                return player.sendMessage(`§cThat ScoreBoard does not exist: ${ScoreBoardName}. Please try again.`)
            const database = JSON.parse(Database.get('LeaderBoard') || '{}')
            database[LeaderBoardName] = {
                ScoreBoardName,
                MaxUsers,
                LeaderLocation: {
                    location: player.location,
                    dimension: player.dimension.id
                },
                scores: []
            }
            world.getDimension(player.dimension.id).spawnEntity('boss:floating_leaderboard', player.location).nameTag = `§a${LeaderBoardName} LeaderBoard`
            Database.set('LeaderBoard', JSON.stringify(database))
            player.sendMessage(`§aLeaderBoard has been created.\n§9ScoreBoard Name: ${ScoreBoardName}\n§9LeaderBoard Name: ${LeaderBoardName}\n§9Max Users: ${MaxUsers}\n§9Leader Location: ${player.location.x.toFixed(2)}, ${player.location.y.toFixed(2)}, ${player.location.z.toFixed(2)}, ${player.dimension.id.split(':')[1]}`)
        })
}

/**
 * @param {Player} player
 */
function RemoveLeaderBoard(player) {
    const database = JSON.parse(Database.get('LeaderBoard') || '{}')
    const form = new ActionFormData()
    form.title('§cRemove LeaderBoard')
    form.body('§aPlease Select A LeaderBoard From Below')
    Object.entries(database).map(([LeaderBoardName, data]) => form.button(`§a${LeaderBoardName} - location:
§b${data.LeaderLocation.location.x.toFixed(2)} ${data.LeaderLocation.location.y.toFixed(2)} ${data.LeaderLocation.location.z.toFixed(2)}`, 'textures/ui/confirm'))
    form.button('§cBack', 'textures/ui/cancel')
    form.show(player).then(({ canceled, selection }) => {
        if (canceled) return;
        const array = Object.entries(database)
        if (!array[selection]) return MainMenu(player)
        const location = array[selection][1].LeaderLocation
        delete database[array[selection][0]]
        world.getDimension(location.dimension).getEntitiesAtBlockLocation(location.location).filter(entity => entity.typeId === 'boss:floating_leaderboard').forEach(entity => entity.remove())
        Database.set('LeaderBoard', JSON.stringify(database))
        player.sendMessage(`§aLeaderBoard has been removed.\n§9LeaderBoard Name: ${array[selection][0]}\n§9ScoreBoard Name: ${array[selection][1].ScoreBoardName}`)
    })
}

/**
 * @param {Player} player
 */
function EditLeaderBoard(player) {
    const database = JSON.parse(Database.get('LeaderBoard') || '{}')
    const array = Object.entries(database)
    const form = new ActionFormData()
    form.title('§aEdit LeaderBoard')
    form.body('§aPlease Select A LeaderBoard From Below')
    Object.entries(database).map(([LeaderBoardName, data]) => form.button(`§a${LeaderBoardName} - location:
        §b${data.LeaderLocation.location.x.toFixed(2)} ${data.LeaderLocation.location.y.toFixed(2)} ${data.LeaderLocation.location.z.toFixed(2)}`, 'textures/ui/confirm'))
    form.button('§cBack', 'textures/ui/cancel')
    form.show(player).then(({ canceled, selection }) => {
        if (canceled) return;
        if (!array[selection]) return MainMenu(player)
        const location = array[selection][1].LeaderLocation
        new ModalFormData()
            .title('§aEdit LeaderBoard')
            .textField('§9ScoreBoard Name', '', array[selection][1].ScoreBoardName)
            .textField('§9LeaderBoard Name', '', array[selection][0])
            .slider('§9LeaderBoard Max Users', 1, 10, 1, array[selection][1].MaxUsers)
            .toggle('§cRefresh Spawn LeaderBoard', false)
            .toggle('§cAre you sure you want to  set the LeaderBoard to your current location?', false)
            .show(player).then(({ canceled, formValues: [ScoreBoardName, LeaderBoardName, MaxUsers, Respawn, Confirm] }) => {
                if (canceled) return;
                const newdata = database[array[selection][0]]
                if (Respawn) {
                    world.getDimension(location.dimension).getEntitiesAtBlockLocation(location.location).filter(entity => entity.typeId === 'boss:floating_leaderboard').forEach(entity => entity.remove());
                    return world.getDimension(player.dimension.id).spawnEntity('boss:floating_leaderboard', location.location).nameTag = `§a${LeaderBoardName.length > 0 ? LeaderBoardName : array[selection][0]} LeaderBoard`
                }
                if (ScoreBoardName.length > 0 && !world.scoreboard.getObjective(ScoreBoardName))
                    return player.sendMessage(`§cThat ScoreBoard does not exist: ${ScoreBoardName}. Please try again.`)
                if (ScoreBoardName.length > 0) newdata.ScoreBoardName = ScoreBoardName, newdata.scores = {}
                if (MaxUsers) newdata.MaxUsers = MaxUsers
                if (Confirm) {
                    newdata.LeaderLocation = {
                        location: player.location,
                        dimension: player.dimension.id
                    }
                }
                delete database[array[selection][0]]
                database[LeaderBoardName.length > 0 ? LeaderBoardName : array[selection][0]] = newdata
                world.getDimension(location.dimension).getEntitiesAtBlockLocation(location.location).filter(entity => entity.typeId === 'boss:floating_leaderboard').forEach(entity => entity.remove())
                Database.set('LeaderBoard', JSON.stringify(database))
                const Newdata = JSON.parse(Database.get('LeaderBoard'))[LeaderBoardName.length > 0 ? LeaderBoardName : array[selection][0]]
                world.getDimension(Newdata.LeaderLocation.dimension).spawnEntity('boss:floating_leaderboard', Newdata.LeaderLocation.location).nameTag = `§a${LeaderBoardName.length > 0 ? LeaderBoardName : array[selection][0]} LeaderBoard`
                player.sendMessage(`§aLeaderBoard has been edited.\n§9LeaderBoard Name: ${LeaderBoardName.length > 0 ? LeaderBoardName : array[selection][0]}\n§9ScoreBoard Name: ${ScoreBoardName.length > 0 ? ScoreBoardName : array[selection][1].ScoreBoardName}\n§9Max Users: ${MaxUsers ? MaxUsers : array[selection][1].MaxUsers}\n§9Leader Location: ${Newdata.LeaderLocation.location.x.toFixed(2)}, ${Newdata.LeaderLocation.location.y.toFixed(2)}, ${Newdata.LeaderLocation.location.z.toFixed(2)}, ${Newdata.LeaderLocation.dimension.split(':')[1]}`)
            })
    })
}

system.runInterval(() => {
    const database = JSON.parse(Database.get('LeaderBoard') || '{}')
    Object.entries(database).forEach(([LeaderBoardName, LeaderBoardData]) => {
        const { ScoreBoardName, MaxUsers, LeaderLocation, scores = {} } = LeaderBoardData
        world.scoreboard.getObjective(ScoreBoardName).getScores()
            .filter(v => v && v.participant && v.participant.displayName !== "commands.scoreboard.players.offlinePlayerName")
            .forEach(value => scores[value.participant.getEntity().name] = value.score);
        const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a).slice(0, MaxUsers ?? 10).reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
        Database.set('LeaderBoard', JSON.stringify({ ...database, [LeaderBoardName]: { ...LeaderBoardData, scores: sortedScores } }))
        const { location, dimension } = LeaderLocation
        try {
            const getEntity = world.getDimension(dimension).getEntitiesAtBlockLocation(location)
            const leaderboardEntity = getEntity.find(entity => entity.typeId === 'boss:floating_leaderboard' && entity.nameTag.includes(LeaderBoardName))
            if (!leaderboardEntity?.nameTag) return
            leaderboardEntity.nameTag = `§a${LeaderBoardName} LeaderBoard\n${Object.entries(sortedScores).map(([user, score], i) => `${i + 1} ${user}: ${score}`).join('\n')}`
        } catch (e) { }
    })
})
