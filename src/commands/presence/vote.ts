import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, Collection, Collector, ComponentType, EmbedBuilder, Message, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, User } from "discord.js";
import { Color } from "../../index.js";
import { Command } from "../../utils/command.js";

const VOTES = new Collection<string, { option: string, votes: Set<User> }[]>();

const createDesc = (id: string) => {

    let embedDesc = "Appuyer sur le bouton qui correspond a votre vote";
    const votes = VOTES.get(id)!;

    votes.forEach((value, index) => {
        embedDesc += `\n\n${index + 1} - ${value.option}`;
        value.votes.forEach(user => {
            embedDesc += `\n${user}`;
        })
    })

    return embedDesc
}

export default new Command({
    name: "vote",
    description: "Créer un vote",
    options: [
        {
            name: "options",
            description: "Les differentes options possibles (séparer par un point virgule les options): first; second; third;",
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: "temps",
            description: "La durée pour laquelle la commande est active (en minutes)",
            type: ApplicationCommandOptionType.Integer,
            minValue: 0,
            maxValue: 15,
            required: false
        }
    ],
    execute: async ({ bot, interaction }) => {
        await interaction.deferReply();

        const options = interaction.options.getString("options")!;
        const TIME = interaction.options.getInteger('temps') ? interaction.options.getInteger('temps')! : 10;

        const optionsSlices = options
            .split(";")
            .map(option => option.trim())
            .filter(v => v.length);

        VOTES.set(interaction.id, optionsSlices.map(slice => {
            return {
                option: slice,
                votes: new Set()
            };
        }));

        const buttons: ButtonBuilder[] = [];

        optionsSlices.forEach((option, index) => {
            buttons.push(
                new ButtonBuilder()
                    .setLabel(`${index + 1}`)
                    .setCustomId(`button-${index}`)
                    .setStyle(ButtonStyle.Primary)
            );
        });

        buttons.push(
            new ButtonBuilder()
                .setLabel(`Expire dans ${TIME} minutes`)
                .setCustomId("expired")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

        const actionRow = new ActionRowBuilder<ButtonBuilder>({ components: buttons });

        const embed = new EmbedBuilder()
            .setTitle("Vote")
            .setDescription(createDesc(interaction.id))
            .setColor(Color.Primary);

        const message = await interaction.followUp({
            embeds: [embed],
            components: [actionRow],
            fetchReply: true
        }) as Message<boolean>;

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button, time: TIME * 59 * 1000
        });

        collector.on('collect', async i => {

            if (i.customId == "expired") {
                VOTES.delete(interaction.id!);
                buttons.forEach(c => c.setDisabled(true));
                buttons.find((c: any) => c.data.custom_id === "expired")?.setLabel(`Cancelled by user`);
                collector.stop();

                interaction.editReply({
                    components: [actionRow.setComponents(buttons)]
                });
                return;
            }

            const btnIndex = +i.customId.split('-')[1];

            const votes = VOTES.get(interaction.id)!;

            // Check if user already voted
            votes.forEach(value => {

                if (value.votes.has(i.user)) {
                    // if he already voted, delete the previous vote
                    value.votes.delete(i.user);
                }

                votes[btnIndex].votes.add(i.user);
            })

            interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Vote")
                        .setDescription(createDesc(interaction.id))
                        .setColor(Color.Primary)
                ]
            });

            await i.deferUpdate();
        });

        collector.on('end', (i) => {

            console.log("Collector end");


            VOTES.delete(interaction.id!);
            buttons.forEach(c => c.setDisabled(true));
            buttons.find((c: any) => c.data.custom_id === "expired")?.setLabel(`Expiré apres ${collector.options.time! / 1000 / 60} minutes`);
            collector.stop();

            interaction.editReply({
                components: [actionRow.setComponents(buttons)]
            });
        })

    }
});

