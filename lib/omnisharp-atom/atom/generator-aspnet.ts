import {CompositeDisposable, Disposable, Observable} from "rx";
import Omni = require('../../omni-sharp-server/omni')
import StatusBarComponent = require('../views/status-bar-view');
import React = require('react');
import {each, delay, any, endsWith, filter} from "lodash";
import * as fs from "fs";
import * as path from "path";
import {solutionInformation} from "../atom/solution-information";
import {DriverState} from "omnisharp-client";

var readdir = Observable.fromNodeCallback(fs.readdir);
var stat = Observable.fromNodeCallback(fs.stat);

// TODO: Make sure it stays in sync with
var commands = [
    'AngularController',
    'AngularControllerAs',
    'AngularDirective',
    'AngularFactory',
    'AngularModule',
    'BowerJson',
    'Class',
    'CoffeeScript',
    'Config',
    'gitignore',
    'Gruntfile',
    'Gulpfile',
    'HTMLPage',
    'Interface',
    'JavaScript',
    'JScript',
    'JSON',
    'JSONSchema',
    'JSX',
    'Middleware',
    'MvcController',
    'MvcView',
    'PackageJson',
    'StartupClass',
    'StyleSheet',
    'StyleSheetLess',
    'StyleSheetSCSS',
    'TagHelper',
    'TextFile',
    'TypeScript',
    'TypeScriptConfig',
    'WebApiController'
];

module Yeoman {
    export interface IMessages {
        cwd?: string;
        skip: string[];
        force: string[];
        create: string[];
        invoke: string[];
        conflict: string[];
        identical: string[];
        info: string[];
    }
}

class GeneratorAspnet implements OmniSharp.IFeature {
    private disposable: Rx.CompositeDisposable;
    private generator: {
        run(generator: string, path?: string, options?: any): Promise<any>; start(prefix: string, path?: string, options?: any): Promise<any>;
        list(prefix?: string, path?: string, options?: any): Promise<{ displayName: string; name: string; resolved: string; }[]>
    };

    public activate() {
        this.disposable = new CompositeDisposable();

        this.disposable.add(atom.commands.add('atom-workspace', 'omnisharp-atom:new-project', () => this.newProject()));
        this.disposable.add(atom.commands.add('atom-workspace', 'c#:new-project', () => this.newProject()));

        this.disposable.add(atom.commands.add('atom-workspace', 'omnisharp-atom:new-class', () => this.run("aspnet:Class")));
        this.disposable.add(atom.commands.add('atom-workspace', 'C#:new-class', () => this.run("aspnet:Class")));

        each(commands, command => {
            this.disposable.add(atom.commands.add('atom-workspace', `omnisharp-atom:aspnet-${command}`, () => this.loadCsFile(this.run(`aspnet:${command}`))));
        })
    }

    private loadCsFile(promise: Promise<any>) {
        return promise.then((messages: Yeoman.IMessages) => {
            var allMessages = messages.skip
                .concat(messages.create)
                .concat(messages.identical)
                .concat(messages.force);

            return Observable.from(['Startup.cs', 'Program.cs', '.cs'])
                .concatMap(file => filter(allMessages, message => endsWith(message, file)))
                .take(1)
                .map(file => path.join(messages.cwd, file))
                .toPromise();
        })
        .then(file => atom.workspace.open(file));
    }

    private newProject() {
        return this.loadCsFile(this.run("aspnet:app --createInDirectory"))
            .then(() => Observable.timer(2000).toPromise())
            .then(() => {
                if (solutionInformation.solutions.length) {
                    atom.commands.dispatch(atom.views.getView(atom.workspace), 'omnisharp-atom:restart-server');
                }
            });
    }

    private run(command: string) {
        return this.generator.run(command, undefined, { promptOnZeroDirectories: true });
    }

    public setup(generator) {
        this.generator = generator;
    }

    public dispose() {
        this.disposable.dispose();
    }

    public required = true;
    public title = 'Aspnet Yeoman Generator';
    public description = 'Enables the aspnet yeoman generator.';
}

export var generatorAspnet = new GeneratorAspnet;
