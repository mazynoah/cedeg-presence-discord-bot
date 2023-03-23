import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, Collection, Colors, ComponentType, EmbedBuilder, Message, User } from "discord.js";
import { Color } from "../../index.js";
import { Command } from "../../utils/command.js";

const PRESENTS = new Collection<string, User[]>();

export default new Command({
    name: "presence",
    description: "Take presence",
    defaultMemberPermissions: "Administrator",
    options: [
        {
            name: "temps",
            description: "La durée pour laquelle la commande est active (en minutes)",
            type: ApplicationCommandOptionType.Integer,
            minValue: 0,
            maxValue: 15,
            required: true
        }
    ],
    execute: async ({ bot, interaction }) => {
        if (PRESENTS.get(interaction.guildId!)) {

            return interaction.reply({
                content: "An instance is already running",
                ephemeral: true
            });
        }

        PRESENTS.set(interaction.guildId!, []);

        await interaction.deferReply();

        const TIME = interaction.options.getInteger('temps')!;

        const buttons = [
            new ButtonBuilder()
                .setLabel("✓ Present")
                .setCustomId("set-present")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setLabel("Annuler")
                .setCustomId("cancel")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setLabel(`Expire dans ${TIME} minutes`)
                .setCustomId("expired")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        ];

        const actionRow = new ActionRowBuilder<ButtonBuilder>({ components: buttons });

        const embed = new EmbedBuilder()
            .setTitle("Presence")
            .setDescription("Appuyer sur le bouton vert pour déclarer votre présence.")
            .setColor(Color.Primary)
            .setTimestamp();

        const message = await interaction.followUp({
            embeds: [embed],
            components: [actionRow],
            fetchReply: true
        }) as Message<boolean>;

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button, time: TIME * 59 * 1000
        });

        collector.on('collect', async i => {
            if (i.customId == "set-present") {
                if (i.user.id == interaction.user.id) {
                    i.reply({ content: "You are the teacher 😄", ephemeral: true });
                    return;
                }

                const presents = PRESENTS.get(interaction.guildId!);
                console.log("presetns: ", presents);

                if (presents) {
                    if (presents.find(user => user.id == i.user.id)) {
                        i.reply({ content: "Tu es deja inscrit comme présent 😄", ephemeral: true });
                        return;
                    }
                }

                interaction.user.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`Info Présence`)
                            .setDescription(`${i.user} est présent`)
                            .setColor(Color.Primary)
                            .setTimestamp()
                    ]
                }).then(() => {
                    i.followUp({ content: `Tas présence a été prise en compte`, ephemeral: true });
                    presents?.push(i.user);
                    PRESENTS.set(interaction.guildId!, presents!);
                    // i.deferUpdate();
                }).catch((err) => {
                    i.followUp({ content: `Une erreur est survenue: ${err}`, ephemeral: true });
                    // i.deferUpdate();
                })
            } else if (i.customId == "cancel") {
                if (i.user.id != interaction.user.id) {
                    i.reply({ content: "Ces boutons ne sont pas pour toi !", ephemeral: true });
                    return;
                }

                PRESENTS.delete(interaction.guildId!);
                buttons.forEach(c => c.setDisabled(true));
                buttons.find((c: any) => c.data.custom_id === "expired")?.setLabel(`Cancelled by user`);
                collector.stop();

                interaction.editReply({
                    components: [actionRow.setComponents(buttons)]
                });
            }

            await i.deferUpdate();
        })

        collector.on('end', (i) => {

            buttons.forEach(c => c.setDisabled(true));
            buttons.find((c: any) => c.data.custom_id === "expired")?.setLabel(`Expiré apres ${collector.options.time! / 1000 / 60} minutes`);
            interaction.editReply({
                components: [actionRow.setComponents(buttons)]
            });
        })
    }
});